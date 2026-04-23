## 1. Project scaffold

- [x] 1.1 Create `viewer/` folder and add `viewer/data/` to `.gitignore`
- [x] 1.2 Add `react` and `react-dom` dependencies (+ types) to root `package.json` if not already present

## 2. R2 fetch logic

- [x] 2.1 Write tests for R2 fetch — covers: fetches and saves DB when missing, skips fetch when local file exists, re-fetches on demand
- [x] 2.2 Implement `viewer/r2.ts` — `fetchDbIfMissing()` and `forceRefresh()` using `Bun.S3Client`; run tests green

## 3. API routes

- [x] 3.1 Write tests for `GET /api/last-run` — covers: returns most recent run, returns null when empty
- [x] 3.2 Implement `GET /api/last-run`; run tests green
- [x] 3.3 Write tests for `GET /api/listings` — covers: returns listings joined with scores ordered by total_score DESC, returns empty array when none
- [x] 3.4 Implement `GET /api/listings`; run tests green
- [x] 3.5 Write tests for `GET /api/listings/:id` — covers: returns listing + parsed rule_breakdown + analysis, returns 404 for unknown id, returns listing with null analysis when none exists
- [x] 3.6 Implement `GET /api/listings/:id`; run tests green
- [x] 3.7 Write tests for `POST /api/refresh` — covers: triggers R2 re-fetch, returns `{ ok: true, fetchedAt }` (covered in r2.test.ts via forceRefresh)
- [x] 3.8 Implement `POST /api/refresh`; run tests green
- [x] 3.9 Write tests for `GET /api/db-info` — covers: returns last-modified timestamp of local DB file
- [x] 3.10 Implement `GET /api/db-info`; run tests green

## 4. Server entry point

- [x] 4.1 Create `viewer/index.ts` — on startup calls `fetchDbIfMissing()`, then starts `Bun.serve()` on port 3000 with all API routes and HTML import

## 5. Frontend

- [x] 5.1 Create `viewer/index.html` — minimal HTML shell that loads `frontend.tsx`
- [x] 5.2 Create `viewer/styles.css` — basic readable layout, no framework
- [x] 5.3 Implement Last Run panel — fetches `/api/last-run`, shows started_at, completed_at, scraped/scored/analysed counts, "No runs recorded yet" when empty
- [x] 5.4 Implement Top Listings table — fetches `/api/listings`, renders score, address, neighbourhood, rooms, living_area_m2, list_price, monthly_fee; "No listings yet" when empty
- [x] 5.5 Implement Listing Detail panel — clicking a row fetches `/api/listings/:id`, renders all fields, per-rule score breakdown, analysis text or "No analysis available"
- [x] 5.6 Implement DB freshness indicator + Refresh button — shows last-modified from `/api/db-info`, calls `POST /api/refresh` on click and reloads all views
