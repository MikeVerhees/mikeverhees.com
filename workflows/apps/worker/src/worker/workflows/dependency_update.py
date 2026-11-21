"""Weekly dependency update for the site repo.

Clones the repository, runs ``bun update --latest`` (latest versions, ignoring the
ranges in package.json, so majors included), runs the project checks, pushes a
``deps/weekly-update-<date>`` branch and opens a draft pull request. The GitHub token
comes from the ``GITHUB_TOKEN`` environment variable, bound from a workspace secret on
the managed deployment; a scheduled run has no user, so it cannot use user OAuth.
"""

import asyncio
import base64
import json
import os
import tempfile
from datetime import timedelta
from pathlib import Path

import mistralai.workflows as workflows
from pydantic import BaseModel, Field

GITHUB_API_BASE = "https://api.github.com"
CHECKS = ("lint", "check", "test", "build")
CLONE_TIMEOUT_SECONDS = 300
BUN_TIMEOUT_SECONDS = 600
CHECK_TIMEOUT_SECONDS = 600
PUSH_TIMEOUT_SECONDS = 300


class DependencyUpdateInput(BaseModel):
    owner: str = "MikeVerhees"
    repo: str = "mikeverhees.com"
    base_branch: str = "main"
    dry_run: bool = False


class DependencyChange(BaseModel):
    name: str
    previous: str
    current: str


class CheckResult(BaseModel):
    name: str
    passed: bool


class PrepareInput(BaseModel):
    owner: str
    repo: str
    base_branch: str
    run_date: str
    dry_run: bool


class PrepareResult(BaseModel):
    branch: str | None = None
    changes: list[DependencyChange] = Field(default_factory=list)
    checks: list[CheckResult] = Field(default_factory=list)


class PullRequestInput(BaseModel):
    owner: str
    repo: str
    base_branch: str
    branch: str
    changes: list[DependencyChange]
    checks: list[CheckResult]


class PullRequestResult(BaseModel):
    pr_url: str


class DependencyUpdateResult(BaseModel):
    branch: str | None = None
    pr_url: str | None = None
    changes: list[DependencyChange] = Field(default_factory=list)
    checks: list[CheckResult] = Field(default_factory=list)
    dry_run: bool = False
    message: str = ""


def _github_token() -> str:
    token = os.environ.get("GITHUB_TOKEN", "").strip()
    if not token:
        raise workflows.WorkflowError(
            "github_token_not_configured: bind a workspace secret to the GITHUB_TOKEN env var",
            non_retryable=True,
        )
    return token


def _git_auth_env(token: str) -> dict[str, str]:
    encoded = base64.b64encode(f"x-access-token:{token}".encode()).decode()
    env = dict(os.environ)
    env["GIT_CONFIG_COUNT"] = "1"
    env["GIT_CONFIG_KEY_0"] = "http.https://github.com/.extraheader"
    env["GIT_CONFIG_VALUE_0"] = f"Authorization: Basic {encoded}"
    return env


async def _run(cmd: list[str], cwd: Path, env: dict[str, str] | None = None, timeout: int = 300) -> int:
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        cwd=cwd,
        env=env,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )
    try:
        await asyncio.wait_for(proc.communicate(), timeout=timeout)
    except TimeoutError:
        proc.kill()
        await proc.wait()
        raise workflows.WorkflowError(f"command timed out after {timeout}s: {' '.join(cmd[:2])}") from None
    if proc.returncode != 0:
        output = (proc.stdout or b"")[:2000].decode(errors="replace") if proc.stdout else ""
        raise workflows.WorkflowError(f"command failed ({proc.returncode}): {' '.join(cmd[:2])}\n{output}")
    return proc.returncode


async def _run_check(cmd: list[str], cwd: Path, timeout: int) -> bool:
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        cwd=cwd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )
    try:
        await asyncio.wait_for(proc.communicate(), timeout=timeout)
    except TimeoutError:
        proc.kill()
        await proc.wait()
        return False
    return proc.returncode == 0


def _diff_dependencies(before: dict, after: dict) -> list[DependencyChange]:
    changes: list[DependencyChange] = []
    for section in ("dependencies", "devDependencies"):
        old = before.get(section) or {}
        new = after.get(section) or {}
        for name in sorted(set(old) | set(new)):
            previous, current = old.get(name), new.get(name)
            if previous != current:
                changes.append(DependencyChange(name=name, previous=previous or "(removed)", current=current or "(removed)"))
    return changes


def _pr_body(args: PullRequestInput) -> str:
    lines = [
        "## Summary",
        "",
        f"- Weekly automated dependency update (`bun update --latest`): {len(args.changes)} package(s) bumped to the latest version, majors included",
        "",
        "| Package | From | To |",
        "| --- | --- | --- |",
    ]
    for change in args.changes:
        lines.append(f"| {change.name} | {change.previous} | {change.current} |")
    lines += ["", "## Checklist", ""]
    for check in args.checks:
        mark = "x" if check.passed else " "
        lines.append(f"- [{mark}] `bun run {check.name}`")
    lines += [
        "",
        "<!-- e2e tests run in CI on this PR -->",
        "",
    ]
    return "\n".join(lines)


@workflows.activity(start_to_close_timeout=timedelta(minutes=25), retry_policy_max_attempts=2)
async def prepare_dependency_update(args: PrepareInput) -> PrepareResult:
    token = _github_token()
    env = _git_auth_env(token)
    workdir = Path(tempfile.mkdtemp(prefix="deps-update-")) / "repo"
    repo_url = f"https://github.com/{args.owner}/{args.repo}.git"
    await _run(["git", "clone", "--depth", "1", "--branch", args.base_branch, repo_url, str(workdir)], cwd=workdir.parent, env=env, timeout=CLONE_TIMEOUT_SECONDS)

    before = json.loads((workdir / "package.json").read_text())
    await _run(["bun", "update", "--latest"], cwd=workdir, timeout=BUN_TIMEOUT_SECONDS)
    after = json.loads((workdir / "package.json").read_text())
    changes = _diff_dependencies(before, after)

    checks: list[CheckResult] = []
    for name in CHECKS:
        passed = await _run_check(["bun", "run", name], cwd=workdir, timeout=CHECK_TIMEOUT_SECONDS)
        checks.append(CheckResult(name=name, passed=passed))

    if args.dry_run:
        return PrepareResult(branch=None, changes=changes, checks=checks)

    branch = f"deps/weekly-update-{args.run_date}"
    await _run(["git", "checkout", "-b", branch], cwd=workdir, env=env, timeout=60)
    await _run(["git", "add", "package.json", "bun.lock"], cwd=workdir, env=env, timeout=60)
    await _run(
        ["git", "-c", "user.name=deps-bot", "-c", "user.email=deps-bot@users.noreply.github.com", "commit", "-m", f"chore(deps): update dependencies {args.run_date}"],
        cwd=workdir,
        env=env,
        timeout=60,
    )
    await _run(["git", "push", "--force", "origin", f"HEAD:refs/heads/{branch}"], cwd=workdir, env=env, timeout=PUSH_TIMEOUT_SECONDS)
    return PrepareResult(branch=branch, changes=changes, checks=checks)


@workflows.activity(start_to_close_timeout=timedelta(minutes=5), retry_policy_max_attempts=3)
async def open_dependency_pr(args: PullRequestInput) -> PullRequestResult:
    import httpx

    token = _github_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    async with httpx.AsyncClient(base_url=GITHUB_API_BASE, headers=headers, timeout=60) as client:
        existing = await client.get(
            f"/repos/{args.owner}/{args.repo}/pulls",
            params={"head": f"{args.owner}:{args.branch}", "state": "open"},
        )
        existing.raise_for_status()
        open_prs = existing.json()
        if open_prs:
            return PullRequestResult(pr_url=open_prs[0]["html_url"])
        run_date = args.branch.rsplit("-", 1)[-1]
        created = await client.post(
            f"/repos/{args.owner}/{args.repo}/pulls",
            json={
                "title": f"chore(deps): weekly dependency update {run_date}",
                "head": args.branch,
                "base": args.base_branch,
                "body": _pr_body(args),
                "draft": True,
            },
        )
        if created.status_code not in (200, 201):
            raise workflows.WorkflowError(f"create_pr_failed: HTTP {created.status_code} {created.text[:500]}")
        return PullRequestResult(pr_url=created.json()["html_url"])


@workflows.workflow.define(name="weekly_dependency_update")
class WeeklyDependencyUpdate:
    @workflows.workflow.entrypoint
    async def run(self, data: DependencyUpdateInput) -> DependencyUpdateResult:
        run_date = workflows.workflow.now().strftime("%Y-%m-%d")
        prepared = await prepare_dependency_update(
            PrepareInput(owner=data.owner, repo=data.repo, base_branch=data.base_branch, run_date=run_date, dry_run=data.dry_run)
        )
        if not prepared.changes:
            return DependencyUpdateResult(dry_run=data.dry_run, checks=prepared.checks, message="no dependency updates available")
        if data.dry_run or prepared.branch is None:
            return DependencyUpdateResult(dry_run=True, changes=prepared.changes, checks=prepared.checks, message="dry run: changes computed, nothing pushed, no PR opened")
        pr = await open_dependency_pr(
            PullRequestInput(
                owner=data.owner,
                repo=data.repo,
                base_branch=data.base_branch,
                branch=prepared.branch,
                changes=prepared.changes,
                checks=prepared.checks,
            )
        )
        return DependencyUpdateResult(
            branch=prepared.branch,
            pr_url=pr.pr_url,
            changes=prepared.changes,
            checks=prepared.checks,
            dry_run=False,
            message="draft PR opened",
        )
