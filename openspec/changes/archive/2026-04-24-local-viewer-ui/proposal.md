## Why

The pipeline runs daily and persists results to a SQLite database in R2, but there is no way to inspect that data without manually downloading the file and running SQL queries. A local viewer makes the output of each run immediately accessible and browsable.

## What Changes

- New `viewer/` folder at project root with its own entry point, not part of the pipeline
- `bun viewer/index.ts` starts a local web server at localhost:3000
- On startup, fetches `data/listings.db` from R2 if no local copy exists; otherwise uses the cached copy
- Manual refresh button in the UI triggers a re-fetch from R2
- React frontend with three views: last run summary, top listings table, listing detail panel

## Capabilities

### New Capabilities
- `local-viewer`: Local web UI for browsing pipeline output — runs, listings, scores, and analyses stored in the SQLite DB

### Modified Capabilities
<!-- none -->

## Impact

- New folder `viewer/` (independent from `src/`)
- Adds `viewer/data/` to `.gitignore`
- Reads from R2 using the same `.env` credentials as the pipeline (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`)
- No changes to the pipeline, storage schema, or GitHub Actions workflow
- No new npm dependencies — uses Bun built-ins (`bun:sqlite`, `Bun.S3Client`, `Bun.serve`)

## Non-goals

- Not a production deployment — local only
- No authentication or multi-user support
- No writes to the database
- Does not replace or duplicate the pipeline's own logging
