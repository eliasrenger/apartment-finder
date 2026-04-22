## Purpose

Defines how the pipeline is triggered and executed. Uses GitHub Actions for scheduling (daily cron + manual dispatch) with a one-shot Bun entry point that runs the full pipeline and exits.

## Requirements

### Requirement: Daily scheduled execution
The pipeline SHALL be triggered automatically once per day at 06:00 UTC via a GitHub Actions cron schedule.

#### Scenario: Workflow runs on schedule
- **WHEN** the GitHub Actions cron expression `0 6 * * *` fires
- **THEN** the pipeline job starts and runs the full script to completion

---

### Requirement: Manual dispatch trigger
The workflow SHALL support manual execution via `workflow_dispatch` so the pipeline can be triggered without waiting for the next scheduled time.

#### Scenario: Manual run succeeds
- **WHEN** a user triggers the workflow from the GitHub Actions UI or via the GitHub CLI
- **THEN** the pipeline job runs identically to a scheduled run

---

### Requirement: One-shot entry point
The pipeline SHALL be implemented as a single Bun script (`src/index.ts`) that initialises the database, runs the full pipeline, and exits with code 0 on success or a non-zero code on unhandled failure.

#### Scenario: Successful run exits cleanly
- **WHEN** the script completes without an unhandled error
- **THEN** the process exits with code 0

#### Scenario: Unhandled error exits non-zero
- **WHEN** an unhandled error is thrown at the top level
- **THEN** the process exits with a non-zero code and the error is logged to stdout as a structured JSON entry

---

### Requirement: Secret injection
All sensitive credentials SHALL be injected into the script as environment variables via GitHub Actions secrets. No secrets SHALL appear in config files or the repository.

#### Scenario: Required secrets are available at runtime
- **WHEN** the workflow job runs
- **THEN** the following environment variables are set from GitHub Actions secrets: `ANTHROPIC_API_KEY`, `DISCORD_WEBHOOK`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`

---

### Requirement: Playwright browser availability
The workflow SHALL install the Chromium browser required by Playwright before running the pipeline script.

#### Scenario: Chromium installed before pipeline runs
- **WHEN** the workflow job executes
- **THEN** `bunx playwright install chromium` runs successfully before `bun src/index.ts` is called

---

### Requirement: Database persistence across runs
The workflow SHALL persist the SQLite database to Cloudflare R2 object storage between runs so that deduplication state is preserved across daily executions. The AWS CLI is used to interact with R2 via its S3-compatible API.

#### Scenario: DB downloaded before pipeline runs
- **WHEN** the workflow job starts
- **THEN** the DB is downloaded from the `apartment-finder` R2 bucket to `data/listings.db` before the pipeline runs

#### Scenario: DB uploaded after pipeline completes
- **WHEN** the pipeline finishes (success or failure)
- **THEN** the updated `data/listings.db` is uploaded to the `apartment-finder` R2 bucket

#### Scenario: Cold start when no DB exists in R2
- **WHEN** no database file exists in R2 (first run)
- **THEN** the download step logs a message and the pipeline starts with a fresh database
