## ADDED Requirements

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
- **THEN** the following environment variables are set from GitHub Actions secrets: `ANTHROPIC_API_KEY`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `NOTIFY_TO`

---

### Requirement: Playwright browser availability
The workflow SHALL install the Chromium browser required by Playwright before running the pipeline script.

#### Scenario: Chromium installed before pipeline runs
- **WHEN** the workflow job executes
- **THEN** `bunx playwright install chromium` runs successfully before `bun src/index.ts` is called

---

### Requirement: Database persistence across runs
The workflow SHALL attempt to restore the SQLite database from cache before the run and save it back to cache after a successful run, so that deduplication state is preserved across daily executions.

#### Scenario: Cache restored on run start
- **WHEN** a cached database file exists from a previous run
- **THEN** it is restored to `data/listings.db` before the pipeline starts

#### Scenario: Cache saved on run end
- **WHEN** the pipeline completes successfully
- **THEN** the updated `data/listings.db` is saved to the GitHub Actions cache

#### Scenario: Cold start on cache miss
- **WHEN** no cached database exists (first run or cache eviction)
- **THEN** the pipeline starts with a fresh database and proceeds normally
