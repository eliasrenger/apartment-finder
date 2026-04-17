## Context

The pipeline currently has no entry point or trigger. The original project spec assumed a Docker container running an internal cron daemon. The user has chosen GitHub Actions as the scheduler instead, which means the pipeline only needs to be a one-shot Bun script — run, complete, exit. GitHub Actions handles the schedule, secrets, and run history.

The SQLite database needs to persist between runs. On GitHub-hosted runners, the workspace is ephemeral, so the database file must be stored elsewhere. GitHub Actions cache is not suitable for mutable data. The practical options are: commit the DB to the repo (not ideal for binary data), use an external store (S3, etc.), or use a persistent volume via a self-hosted runner.

## Goals / Non-Goals

**Goals:**
- A workflow file that runs the pipeline on a daily cron schedule and on manual dispatch
- A one-shot `src/index.ts` entry point: load config, init DB, run pipeline, exit with code 0 on success / non-zero on failure
- Clear documentation of which secrets must be added to GitHub Actions

**Non-Goals:**
- Solving SQLite persistence across ephemeral runner runs — the DB strategy is outside this change's scope (later change)
- CI (tests, linting) — separate workflow if needed
- Self-hosted runner setup

## Decisions

### One-shot entry point, not a daemon
**Decision:** `src/index.ts` runs the full pipeline sequentially and exits.
**Rationale:** GitHub Actions provides the schedule; there is no need for the process to stay alive. A daemon pattern would add complexity with no benefit in this context.
**Alternative considered:** Keep an internal scheduler (`node-cron` / Bun setTimeout loop). Rejected — adds runtime complexity and defeats the purpose of moving to GitHub Actions.

### Workflow triggers: `schedule` + `workflow_dispatch`
**Decision:** Use both `on: schedule` (cron) and `on: workflow_dispatch`.
**Rationale:** `workflow_dispatch` allows manual runs for testing and catch-up without waiting for the next scheduled time. Essential during development.

### Cron time: 06:00 UTC daily
**Decision:** `cron: '0 6 * * *'`
**Rationale:** Early morning Stockholm time (07:00–08:00 CET/CEST), so the digest arrives before the user starts apartment hunting for the day.

### Secrets injected as environment variables
**Decision:** GitHub Actions secrets are mapped to env vars in the workflow step.
**Rationale:** Consistent with how the app already expects credentials — as environment variables, never in config files. No code changes needed to the app's secret handling.

**Required secrets to document:**
- `ANTHROPIC_API_KEY` — Claude API
- `DISCORD_WEBHOOK` — Discord incoming webhook URL for digest notifications (email may be added later)

### Bun installation in workflow
**Decision:** Use `oven-sh/setup-bun` GitHub Action to install Bun before running the script.
**Rationale:** GitHub-hosted runners do not have Bun pre-installed. This is the official action maintained by the Bun team.

### Database file location
**Decision:** Use a path relative to the repo root (`data/listings.db`), committed to `.gitignore`. The workflow will attempt to restore/save it via `actions/cache` keyed on a stable key.
**Rationale:** `actions/cache` is not guaranteed to persist between runs but works well enough for a daily job on a single branch. A cache miss means the scraper re-collects all listings (handled gracefully by the deduplication logic). A more robust solution (e.g., committing the DB or using object storage) is deferred.

## Risks / Trade-offs

**Cache eviction drops DB history** → The scraper's deduplication relies on the DB. A cold start re-scrapes everything; all listings appear "new". Mitigation: the scoring and notification layers should handle re-sends gracefully (deferred to those changes).

**GitHub Actions schedule is approximate** → Cron jobs on GitHub-hosted runners can be delayed by up to ~15 minutes during high load. Acceptable for this use case.

**Playwright on GitHub runners** → Chromium must be installed on the runner. `npx playwright install chromium` (or `bunx playwright install chromium`) adds ~1 minute to the run. Mitigation: cache the Playwright browser binary using `actions/cache` keyed on the Playwright version.

**Secret sprawl** → Two secrets must be configured in the repo settings (`ANTHROPIC_API_KEY`, `DISCORD_WEBHOOK`). Mitigation: document clearly in the workflow file.

## Migration Plan

1. Add `.github/workflows/run-pipeline.yml`
2. Add `src/index.ts` one-shot entry point
3. Update `openspec/config.yaml` to remove `scheduler/` from project structure
4. Add secrets to GitHub repo settings before first scheduled run
5. Trigger a manual run via `workflow_dispatch` to verify end-to-end before relying on the schedule

## Open Questions

- Should the workflow upload the SQLite DB as a workflow artifact (downloadable for 30 days) as a fallback persistence strategy?
- Should `workflow_dispatch` support an input to override the search config (e.g., run for a different area)?
