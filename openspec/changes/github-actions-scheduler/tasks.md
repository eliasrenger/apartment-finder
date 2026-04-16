## 1. Entry Point

- [x] 1.1 Create `src/index.ts` — one-shot pipeline entry point: load config, init DB, run scraper, exit 0 on success; catch unhandled errors, log structured JSON, exit non-zero
- [x] 1.2 Create `tests/index.test.ts` — test exit-code behaviour: success path exits 0, unhandled error exits non-zero and logs structured error — **sub-agent with spec only**
- [x] 1.3 Run tests and iterate until `index.test.ts` passes

## 2. GitHub Actions Workflow

- [ ] 2.1 Create `.github/workflows/run-pipeline.yml` — schedule (`0 6 * * *`) + `workflow_dispatch` triggers; steps: checkout, setup-bun, restore DB cache, `bun install`, `bunx playwright install chromium`, `bun src/index.ts`, save DB cache
- [ ] 2.2 Map all required secrets to environment variables in the workflow: `ANTHROPIC_API_KEY`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `NOTIFY_TO`
- [ ] 2.3 Configure `actions/cache` steps: restore key `db-${{ runner.os }}` from `data/listings.db` before run, save same key after successful run

## 3. Project Housekeeping

- [ ] 3.1 Update `openspec/config.yaml` — remove `scheduler/` from project structure description; remove Docker-related context (Dockerfile, docker-compose.yml, `data/` volume mount)
- [ ] 3.2 Add `data/` directory to `.gitignore` so the SQLite database file is never committed
