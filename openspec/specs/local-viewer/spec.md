## Purpose

Local web UI for browsing pipeline output — runs, listings, scores, and analyses stored in the SQLite DB. A single-command developer tool that fetches the database from R2 on startup (if no local copy exists) and serves a React frontend at localhost:3000.

## Requirements

### Requirement: Viewer starts with a single command
The viewer SHALL start a local HTTP server on port 3000 when the user runs `bun viewer/index.ts`.

#### Scenario: Fresh start, no local DB
- **WHEN** the user runs `bun viewer/index.ts` and no `viewer/data/listings.db` exists
- **THEN** the server fetches `data/listings.db` from R2, saves it to `viewer/data/listings.db`, and starts serving on localhost:3000

#### Scenario: Start with cached DB
- **WHEN** the user runs `bun viewer/index.ts` and `viewer/data/listings.db` already exists
- **THEN** the server starts immediately on localhost:3000 without fetching from R2

---

### Requirement: Manual refresh from R2
The viewer SHALL allow the user to re-fetch the latest DB from R2 without restarting the server.

#### Scenario: User triggers refresh
- **WHEN** the user clicks the "Refresh from R2" button in the UI
- **THEN** the frontend calls `POST /api/refresh`, the server re-downloads `data/listings.db` from R2 into `viewer/data/listings.db`, and all views reload with fresh data

---

### Requirement: Last run summary view
The viewer SHALL display a summary of the most recent pipeline run.

#### Scenario: Run data available
- **WHEN** the user views the Last Run panel
- **THEN** the UI shows started_at, completed_at, listings_scraped, listings_scored, and listings_analysed for the most recent row in the runs table

#### Scenario: No runs yet
- **WHEN** the runs table is empty
- **THEN** the UI shows a "No runs recorded yet" message

---

### Requirement: Top listings table
The viewer SHALL display all listings with their scores in a sortable table.

#### Scenario: Listings with scores displayed
- **WHEN** the user views the Top Listings table
- **THEN** listings are shown ordered by total_score descending, with columns: score, address, neighbourhood, rooms, living_area_m2, list_price, monthly_fee

#### Scenario: No listings yet
- **WHEN** the listings table is empty
- **THEN** the UI shows a "No listings yet" message

---

### Requirement: Listing detail view
The viewer SHALL display a detailed view for a selected listing including score breakdown and analysis.

#### Scenario: User clicks a listing row
- **WHEN** the user clicks a row in the Top Listings table
- **THEN** a detail panel opens showing all listing fields, the per-rule score breakdown (from rule_breakdown JSON), and the analysis text if one exists for that listing

#### Scenario: No analysis for listing
- **WHEN** the selected listing has no row in the analyses table
- **THEN** the detail panel shows all listing and score fields, with "No analysis available" in place of analysis text

---

### Requirement: DB freshness indicator
The viewer SHALL show the user how fresh the local data is.

#### Scenario: DB present
- **WHEN** the viewer is loaded
- **THEN** the UI shows the last-modified timestamp of `viewer/data/listings.db` next to the refresh button
