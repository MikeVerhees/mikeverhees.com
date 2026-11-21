# workflows

Mistral Workflows app that keeps the site's dependencies current. One workflow,
`weekly_dependency_update`, runs on a weekly schedule (Mondays 08:00 Europe/Amsterdam,
see the schedule on the managed deployment):

1. Clones `MikeVerhees/mikeverhees.com` (default branch) with a GitHub token from the
   `GITHUB_TOKEN` env var (bound from a workspace secret on the deployment — a
   scheduled run has no user, so user OAuth cannot be used).
2. Runs `bun update --latest` (latest versions, ignoring package.json ranges, majors
   included) and diffs `package.json`.
3. Runs `bun run lint`, `bun run check`, `bun run test` and `bun run build`.
4. Pushes `deps/weekly-update-<date>` and opens a draft PR listing the bumps and the
   check results. Pass `dry_run: true` in the workflow input to compute changes and
   checks without pushing or opening a PR. If nothing changed, no PR is opened.

## Layout

- `apps/worker/src/worker/workflows/dependency_update.py` — the workflow; the worker
  auto-discovers it, no registration list.
- `apps/worker/tests/` — pytest suite (`mistralai.workflows.testing.create_test_worker`
  with mocked activities, plus unit tests for the diff helper).
- `deploy/docker/Dockerfile.worker` — worker image; installs git + Bun (the update step
  needs `bun`) alongside the Python environment.
- `mistral.json` — app/module manifest used by the managed deployment build.

## Develop

```bash
cd workflows
bash tools/uv.sh sync --all-packages
cd apps/worker && bash ../../tools/uv.sh run --all-packages python -m pytest
cd ../.. && bunx nx run worker:semgrep
```

Deploy from a pushed commit with the Studio workflows API (`deploy_workflow_deployment`,
build directory `workflows`, Dockerfile `deploy/docker/Dockerfile.worker`), bind the
workspace secret as `GITHUB_TOKEN`, then attach the weekly schedule with
`create_workflow_schedule` (cron `0 8 * * 1`, time zone `Europe/Amsterdam`, input
`{"owner": "MikeVerhees", "repo": "mikeverhees.com", "base_branch": "main"}`).

The token needs `contents: write` and `pull requests: write` on the repository
(a fine-grained PAT or a GitHub App installation token).
