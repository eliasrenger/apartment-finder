## Why

The service needs a trigger mechanism to run daily. Rather than managing a long-running Docker container with an internal cron, GitHub Actions provides free scheduled execution, built-in secret management, and run history without any infrastructure to operate.

## What Changes

- Replace the planned Docker-based cron scheduler with a GitHub Actions workflow
- Add a `workflow_dispatch` trigger so the pipeline can also be run manually
- The Bun entry point (`src/index.ts`) becomes a one-shot script: run once and exit
- Secrets (API keys, Discord webhook URL) move from `.env` / Docker environment to GitHub Actions secrets
- Remove `scheduler/` source directory — scheduling is handled entirely by the workflow file
- `docker-compose.yml` and `Dockerfile` are no longer required for the scheduler, though a Dockerfile may still be useful for local reproducibility

## Capabilities

### New Capabilities
- `scheduler`: GitHub Actions workflow that triggers the pipeline on a cron schedule and via manual dispatch; defines the job steps, secret injection, and artifact retention

### Modified Capabilities
- None

## Non-goals

- CI/CD for the codebase itself (no lint, test, or deploy steps in this workflow)
- Self-hosted runners — uses GitHub-hosted `ubuntu-latest`
- Retry logic at the workflow level (handled inside the application)
- Notifications on workflow failure (GitHub's built-in email alerts are sufficient)

## Impact

- New file: `.github/workflows/run-scraper.yml`
- New file: `src/index.ts` — one-shot entry point that runs the full pipeline and exits
- `src/scheduler/` directory is not needed; remove from project structure in `openspec/config.yaml`
- Secrets previously in `.env` must be documented so they can be added to the GitHub repo's Actions secrets: `ANTHROPIC_API_KEY`, `DISCORD_WEBHOOK`
- Notification channel is Discord (via incoming webhook); email may be added later
