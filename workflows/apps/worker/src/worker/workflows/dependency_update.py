"""Weekly dependency update for the site repo.

Clones the repository and updates every dependency to its latest version (majors
included via ``bun update --latest``). The all-latest state is checked first; when a
check fails, each candidate bump is applied on its own and reverted when it breaks a
check, so the pushed branch only contains updates that keep lint/check/test/build
green. Skipped packages are retried automatically on the next weekly run (every run
starts from latest again). The result is pushed as ``deps/weekly-update-<date>`` with a
draft PR that lists updated and skipped packages and why. The GitHub token comes from
the ``GITHUB_TOKEN`` env var (the console-bound name ``github_token`` also works),
bound from a workspace secret on the managed deployment; a scheduled run has no user,
so it cannot use user OAuth.
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
OUTPUT_TAIL_CHARS = 2000


class DependencyUpdateInput(BaseModel):
    owner: str = "MikeVerhees"
    repo: str = "mikeverhees.com"
    base_branch: str = "main"
    dry_run: bool = False


class DependencyChange(BaseModel):
    name: str
    previous: str
    current: str


class SkippedChange(BaseModel):
    name: str
    previous: str
    current: str
    failed_check: str
    output: str


class CheckResult(BaseModel):
    name: str
    passed: bool
    output: str = ""


class PrepareInput(BaseModel):
    owner: str
    repo: str
    base_branch: str
    run_date: str
    dry_run: bool


class PrepareResult(BaseModel):
    branch: str | None = None
    changes: list[DependencyChange] = Field(default_factory=list)
    skipped: list[SkippedChange] = Field(default_factory=list)
    checks: list[CheckResult] = Field(default_factory=list)


class PullRequestInput(BaseModel):
    owner: str
    repo: str
    base_branch: str
    branch: str
    changes: list[DependencyChange]
    skipped: list[SkippedChange]
    checks: list[CheckResult]


class PullRequestResult(BaseModel):
    pr_url: str


class DependencyUpdateResult(BaseModel):
    branch: str | None = None
    pr_url: str | None = None
    changes: list[DependencyChange] = Field(default_factory=list)
    skipped: list[SkippedChange] = Field(default_factory=list)
    checks: list[CheckResult] = Field(default_factory=list)
    dry_run: bool = False
    message: str = ""


def _github_token() -> str:
    token = (os.environ.get("GITHUB_TOKEN") or os.environ.get("github_token") or "").strip()
    if not token:
        raise workflows.WorkflowError(
            "github_token_not_configured: bind the workspace secret 'github_token' to a GITHUB_TOKEN env var",
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
        output = (proc.stdout or b"")[:OUTPUT_TAIL_CHARS].decode(errors="replace") if proc.stdout else ""
        raise workflows.WorkflowError(f"command failed ({proc.returncode}): {' '.join(cmd[:2])}\n{output}")
    return proc.returncode


async def _run_check(cmd: list[str], cwd: Path, timeout: int) -> tuple[bool, str]:
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        cwd=cwd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )
    try:
        out, _ = await asyncio.wait_for(proc.communicate(), timeout=timeout)
    except TimeoutError:
        proc.kill()
        await proc.wait()
        return False, f"timed out after {timeout}s"
    output = (out or b"").decode(errors="replace")
    return proc.returncode == 0, "" if proc.returncode == 0 else output[-OUTPUT_TAIL_CHARS:]


async def _run_checks(workdir: Path) -> tuple[CheckResult | None, list[CheckResult]]:
    """Run all checks in order, stopping at the first failure.

    Returns the failing check (None when all pass) and the results collected so far.
    """
    results: list[CheckResult] = []
    for name in CHECKS:
        passed, output = await _run_check(["bun", "run", name], cwd=workdir, timeout=CHECK_TIMEOUT_SECONDS)
        results.append(CheckResult(name=name, passed=passed, output=output))
        if not passed:
            return results[-1], results
    return None, results


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
        f"- Weekly automated dependency update (`bun update --latest`, majors included): "
        f"**{len(args.changes)} updated**, **{len(args.skipped)} skipped** (they break checks)",
        "- Skipped packages are retried automatically on the next weekly run",
        "",
    ]
    if args.changes:
        lines += ["## Updated", "", "| Package | From | To |", "| --- | --- | --- |"]
        for change in args.changes:
            lines.append(f"| {change.name} | {change.previous} | {change.current} |")
        lines.append("")
    if args.skipped:
        lines += [
            "## Skipped (breaks checks — retried next run)",
            "",
            "| Package | From | To | Failed check |",
            "| --- | --- | --- | --- |",
        ]
        for skipped in args.skipped:
            lines.append(f"| {skipped.name} | {skipped.previous} | {skipped.current} | `bun run {skipped.failed_check}` |")
        lines += ["", "### Why skipped", ""]
        for skipped in args.skipped:
            lines += [
                "<details>",
                f"<summary><code>{skipped.name}</code> — <code>bun run {skipped.failed_check}</code> failed</summary>",
                "",
                "```",
                skipped.output,
                "```",
                "",
                "</details>",
                "",
            ]
    lines += ["## Checklist", ""]
    for check in args.checks:
        mark = "x" if check.passed else " "
        lines.append(f"- [{mark}] `bun run {check.name}`")
    lines += [
        "",
        "<!-- e2e tests run in CI on this PR -->",
        "",
    ]
    return "\n".join(lines)


@workflows.activity(start_to_close_timeout=timedelta(minutes=45), retry_policy_max_attempts=2)
async def prepare_dependency_update(args: PrepareInput) -> PrepareResult:
    token = _github_token()
    env = _git_auth_env(token)
    workdir = Path(tempfile.mkdtemp(prefix="deps-update-")) / "repo"
    repo_url = f"https://github.com/{args.owner}/{args.repo}.git"
    await _run(["git", "clone", "--depth", "1", "--branch", args.base_branch, repo_url, str(workdir)], cwd=workdir.parent, env=env, timeout=CLONE_TIMEOUT_SECONDS)

    manifest = workdir / "package.json"
    lockfile = workdir / "bun.lock"
    before = json.loads(manifest.read_text())
    await _run(["bun", "update", "--latest"], cwd=workdir, timeout=BUN_TIMEOUT_SECONDS)
    candidates = _diff_dependencies(before, json.loads(manifest.read_text()))

    failed, checks = await _run_checks(workdir)
    accepted: list[DependencyChange] = []
    skipped: list[SkippedChange] = []
    if candidates and failed is not None:
        # All-latest breaks a check: apply candidates one at a time, reverting any that fail.
        await _run(["git", "checkout", "--", "package.json", "bun.lock"], cwd=workdir, env=env, timeout=60)
        await _run(["bun", "install"], cwd=workdir, timeout=BUN_TIMEOUT_SECONDS)
        snapshots: list[tuple[bytes, bytes]] = []
        for change in candidates:
            snapshots.append((manifest.read_bytes(), lockfile.read_bytes()))
            await _run(["bun", "update", "--latest", change.name], cwd=workdir, timeout=BUN_TIMEOUT_SECONDS)
            failed, _ = await _run_checks(workdir)
            if failed is None:
                accepted.append(change)
                continue
            manifest.write_bytes(snapshots[-1][0])
            lockfile.write_bytes(snapshots[-1][1])
            snapshots.pop()
            await _run(["bun", "install"], cwd=workdir, timeout=BUN_TIMEOUT_SECONDS)
            skipped.append(
                SkippedChange(name=change.name, previous=change.previous, current=change.current, failed_check=failed.name, output=failed.output)
            )
        # If the combined accepted state still fails (interactions), drop the most recent accepts until green.
        while accepted:
            failed, _ = await _run_checks(workdir)
            if failed is None:
                break
            manifest.write_bytes(snapshots[-1][0])
            lockfile.write_bytes(snapshots[-1][1])
            snapshots.pop()
            await _run(["bun", "install"], cwd=workdir, timeout=BUN_TIMEOUT_SECONDS)
            change = accepted.pop()
            skipped.append(
                SkippedChange(name=change.name, previous=change.previous, current=change.current, failed_check=failed.name, output=failed.output)
            )
        _, checks = await _run_checks(workdir)
    else:
        accepted = candidates

    if args.dry_run or not accepted:
        return PrepareResult(branch=None, changes=accepted, skipped=skipped, checks=checks)

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
    return PrepareResult(branch=branch, changes=accepted, skipped=skipped, checks=checks)


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
        run_date = args.branch.rsplit("-", 1)[-1]
        title = f"chore(deps): weekly dependency update {run_date}"
        if open_prs:
            # A re-run on the same date branch: refresh the existing PR's title and body.
            number = open_prs[0]["number"]
            updated = await client.patch(
                f"/repos/{args.owner}/{args.repo}/pulls/{number}",
                json={"title": title, "body": _pr_body(args)},
            )
            updated.raise_for_status()
            return PullRequestResult(pr_url=open_prs[0]["html_url"])
        created = await client.post(
            f"/repos/{args.owner}/{args.repo}/pulls",
            json={
                "title": title,
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
            if prepared.skipped:
                message = f"all {len(prepared.skipped)} candidate update(s) break checks; nothing applied, retried next run"
            else:
                message = "no dependency updates available"
            return DependencyUpdateResult(dry_run=data.dry_run, skipped=prepared.skipped, checks=prepared.checks, message=message)
        if data.dry_run or prepared.branch is None:
            return DependencyUpdateResult(
                dry_run=True, changes=prepared.changes, skipped=prepared.skipped, checks=prepared.checks, message="dry run: changes computed, nothing pushed, no PR opened"
            )
        pr = await open_dependency_pr(
            PullRequestInput(
                owner=data.owner,
                repo=data.repo,
                base_branch=data.base_branch,
                branch=prepared.branch,
                changes=prepared.changes,
                skipped=prepared.skipped,
                checks=prepared.checks,
            )
        )
        return DependencyUpdateResult(
            branch=prepared.branch,
            pr_url=pr.pr_url,
            changes=prepared.changes,
            skipped=prepared.skipped,
            checks=prepared.checks,
            dry_run=False,
            message="draft PR opened",
        )
