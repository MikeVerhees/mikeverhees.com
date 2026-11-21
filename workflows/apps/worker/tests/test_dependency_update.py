import asyncio
from datetime import timedelta

import mistralai.workflows as workflows
from mistralai.workflows.testing import create_test_worker
from worker.workflows.dependency_update import (
    CheckResult,
    DependencyChange,
    DependencyUpdateInput,
    PrepareInput,
    PrepareResult,
    PullRequestInput,
    PullRequestResult,
    SkippedChange,
    WeeklyDependencyUpdate,
    _diff_dependencies,
)

WORKFLOW_EXECUTION_TIMEOUT = timedelta(seconds=10)

STATE = {"with_changes": True, "with_skipped": False}
CALLS: list[str] = []
PR_ARGS: list[PullRequestInput] = []


@workflows.activity(name="prepare_dependency_update")
async def _fake_prepare(args: PrepareInput) -> PrepareResult:
    CALLS.append("prepare")
    changes = [DependencyChange(name="astro", previous="^7.0.0", current="^7.4.13")] if STATE["with_changes"] else []
    skipped = (
        [SkippedChange(name="typescript", previous="^6.0.3", current="^7.0.2", failed_check="check", output="astro check does not support TS 7")]
        if STATE["with_skipped"]
        else []
    )
    branch = None if args.dry_run else f"deps/weekly-update-{args.run_date}"
    return PrepareResult(branch=branch, changes=changes, skipped=skipped, checks=[CheckResult(name="lint", passed=True)])


@workflows.activity(name="open_dependency_pr")
async def _fake_open_pr(args: PullRequestInput) -> PullRequestResult:
    CALLS.append("open_pr")
    PR_ARGS.append(args)
    return PullRequestResult(pr_url="https://github.com/MikeVerhees/mikeverhees.com/pull/1")


async def _run_workflow(temporal_env, execution_id: str, data: DependencyUpdateInput) -> dict:
    async with create_test_worker(temporal_env, workflows=[WeeklyDependencyUpdate], activities=[_fake_prepare, _fake_open_pr]):
        handle = await temporal_env.client.start_workflow(
            "weekly_dependency_update",
            data.model_dump(),
            id=execution_id,
            task_queue="test-task-queue",
            execution_timeout=WORKFLOW_EXECUTION_TIMEOUT,
        )
        return await asyncio.wait_for(handle.result(), timeout=15)


async def test_changes_open_draft_pr(temporal_env) -> None:
    STATE["with_changes"] = True
    STATE["with_skipped"] = False
    CALLS.clear()
    PR_ARGS.clear()
    result = await _run_workflow(temporal_env, "test-changes-open-pr", DependencyUpdateInput(dry_run=False))
    assert CALLS == ["prepare", "open_pr"]
    assert result["pr_url"] == "https://github.com/MikeVerhees/mikeverhees.com/pull/1"
    assert result["branch"].startswith("deps/weekly-update-")
    assert result["changes"][0]["name"] == "astro"
    assert result["message"] == "draft PR opened"


async def test_skipped_packages_reach_the_pr(temporal_env) -> None:
    STATE["with_changes"] = True
    STATE["with_skipped"] = True
    CALLS.clear()
    PR_ARGS.clear()
    result = await _run_workflow(temporal_env, "test-skipped-in-pr", DependencyUpdateInput(dry_run=False))
    assert CALLS == ["prepare", "open_pr"]
    assert result["skipped"][0]["name"] == "typescript"
    assert result["skipped"][0]["failed_check"] == "check"
    assert PR_ARGS[0].skipped[0].name == "typescript"


async def test_dry_run_computes_changes_without_pushing(temporal_env) -> None:
    STATE["with_changes"] = True
    CALLS.clear()
    result = await _run_workflow(temporal_env, "test-dry-run", DependencyUpdateInput(dry_run=True))
    assert CALLS == ["prepare"]
    assert result["dry_run"] is True
    assert result["pr_url"] is None
    assert result["branch"] is None
    assert len(result["changes"]) == 1


async def test_no_updates_skips_pr(temporal_env) -> None:
    STATE["with_changes"] = False
    STATE["with_skipped"] = False
    CALLS.clear()
    result = await _run_workflow(temporal_env, "test-no-updates", DependencyUpdateInput(dry_run=False))
    assert CALLS == ["prepare"]
    assert result["message"] == "no dependency updates available"
    assert result["pr_url"] is None


async def test_all_candidates_break_checks_skips_pr(temporal_env) -> None:
    STATE["with_changes"] = False
    STATE["with_skipped"] = True
    CALLS.clear()
    result = await _run_workflow(temporal_env, "test-all-skipped", DependencyUpdateInput(dry_run=False))
    assert CALLS == ["prepare"]
    assert result["pr_url"] is None
    assert "break checks" in result["message"]


def test_diff_dependencies_compares_both_sections() -> None:
    before = {"dependencies": {"x": "1.0.0"}, "devDependencies": {"astro": "^7.0.0", "svelte": "^5.0.0"}}
    after = {"dependencies": {"x": "2.0.0"}, "devDependencies": {"astro": "^7.4.13", "svelte": "^5.0.0"}}
    changes = _diff_dependencies(before, after)
    assert changes == [
        DependencyChange(name="x", previous="1.0.0", current="2.0.0"),
        DependencyChange(name="astro", previous="^7.0.0", current="^7.4.13"),
    ]


def test_diff_dependencies_ignores_unchanged() -> None:
    manifest = {"devDependencies": {"astro": "^7.4.13"}}
    assert _diff_dependencies(manifest, manifest) == []
