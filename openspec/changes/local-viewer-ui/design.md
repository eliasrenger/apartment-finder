## Context

The pipeline stores all data in a SQLite file (`data/listings.db`) that is synced to R2 after each run. Until now there is no way to inspect that data without downloading the file manually and writing ad-hoc SQL. The viewer is a standalone developer tool — separate from the pipeline — that fetches the DB from R2 and serves a local React UI over it.

## Goals / Non-Goals

**Goals:**
- Single command (`bun viewer/index.ts`) to start the viewer
- Fetch DB from R2 on startup if no local copy exists; use cached copy if present
- Manual refresh via a UI button to re-fetch from R2
- Three views: last run summary, top listings table, listing detail with score breakdown

**Non-Goals:**
- Not a production deployment — localhost only
- No writes to the database
- No authentication
- No new npm dependencies (Bun built-ins only)

## Decisions

### Separate `viewer/` folder, not inside `src/`
The viewer is a developer tool, not part of the pipeline. Keeping it in its own root-level folder makes the boundary explicit and avoids polluting `src/` with UI code that has no relation to the scraping/scoring pipeline.

**Alternative considered**: putting it in `src/viewer/` — rejected because it implies the viewer is part of the pipeline runtime.

### Own cached DB at `viewer/data/listings.db`
The viewer writes its own local copy of the DB rather than sharing `data/listings.db` with the pipeline. This avoids any risk of the viewer overwriting a locally-running pipeline's DB.

**Alternative considered**: shared `data/listings.db` — rejected because a manual refresh could clobber an in-progress local run.

### `Bun.serve()` with HTML imports — no separate bundler
Bun's built-in bundler handles `.tsx` and `.css` imports from HTML files automatically. No Vite, no Webpack, no extra config.

### API-first backend, React frontend
The server exposes JSON REST endpoints; the React frontend fetches from them. This makes each view independently testable via curl and keeps backend query logic out of the frontend.

**API routes:**
```
GET  /api/last-run          → most recent row from runs table
GET  /api/listings          → listings JOIN scores, ordered by total_score DESC
GET  /api/listings/:id      → single listing + score breakdown + analysis
POST /api/refresh           → re-fetches DB from R2, returns { ok: true }
```

### Bun S3Client for R2 fetch
Same credentials as the pipeline (`.env` at project root). Endpoint uses the `.eu.` regional subdomain (`https://${R2_ACCOUNT_ID}.eu.r2.cloudflarestorage.com`). Key: `data/listings.db`.

### No Tailwind — inline CSS module
The UI is read-only and has three simple views. Plain CSS in a single `styles.css` file keeps it lean and avoids a build-time dependency.

## Risks / Trade-offs

- **Stale data** → Mitigated by the refresh button; the UI shows the DB file's last-modified timestamp so the user knows how fresh the data is.
- **Viewer DB gets out of sync with R2** → Acceptable — viewer is a read-only inspection tool, not a live dashboard.
- **No tests for the viewer** → Acceptable trade-off; viewer is a dev tool with no business logic beyond SQL queries.

## Open Questions

- None — scope is fully defined.
