## Why

After scraping, every listing sits unranked in the database — the user has no way to know which ones are worth looking at. A deterministic scoring engine turns raw listing data into a ranked shortlist, filtering noise before the expensive AI agent runs.

## What Changes

- Add `src/scoring/` module with four components: area price resolution, individual scoring rules, a score aggregator, and a runner that scores all new listings from a run
- Add a static dataset mapping Stockholm neighbourhoods → average SEK/m² with a three-tier fallback (neighbourhood alias → postal code zone → municipality)
- Scores are persisted to the `scores` table with a full rule-by-rule JSON breakdown for transparency
- The pipeline entry point (`src/index.ts`) gains a scoring step between scraping and AI analysis

## Capabilities

### New Capabilities
- `scoring`: Deterministic rule-based scoring engine — area price resolution, weighted rules across all structured listing fields, score persistence, and a pipeline runner

### Modified Capabilities
- None

## Non-goals

- AI/LLM-based scoring — that is the agent layer
- Scraping additional data to fill blind spots (BRF debt, renovation condition, light orientation)
- User-configurable rule weights at runtime — weights are hardcoded; the config.yaml may expose simple thresholds later
- Geocoding or external API calls for location enrichment

## Impact

- New files: `src/scoring/area-prices.ts`, `src/scoring/resolve-area.ts`, `src/scoring/rules.ts`, `src/scoring/score-listing.ts`, `src/scoring/run-scoring.ts`, `src/scoring/index.ts`
- New test files mirroring the above under `tests/scoring/`
- `src/index.ts` updated to call `runScoring(db)` after `runScraper`
- No schema changes — `scores` table already exists
- Pipeline stage touched: **scoring** (between scraper and agent)
