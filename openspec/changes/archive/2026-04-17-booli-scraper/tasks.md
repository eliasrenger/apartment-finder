## 1. Setup

- [x] 1.1 Install `playwright` dependency and run `bunx playwright install chromium` — modifies `package.json`

## 2. Search Config

- [x] 2.1 Create `tests/config/search-config.test.ts` — test schema validation (valid config, invalid objectType, missing required field) and URL construction (all params present, page increment, URL encoding) — **sub-agent with spec only**
- [x] 2.2 Create `src/config/search-config.ts` — Zod schema for `SearchConfig`, `loadSearchConfig(path)`, `buildSearchUrl(config, page)`; export `OBJECT_TYPES` const and inferred `SearchConfig` type
- [x] 2.3 Run tests and iterate until `search-config.test.ts` passes

## 3. Scraper Selectors

- [x] 3.1 Create `src/scraper/selectors.ts` — named constants for all CSS selectors and data attributes used in both phases

## 4. Phase 1 — Href Collection

- [x] 4.1 Create `tests/fixtures/search-results.html` — minimal static HTML fixture representing a booli.se search results page with listing hrefs
- [x] 4.2 Create `tests/scraper/collect-hrefs.test.ts` — test href parsing from fixture, deduplication exclusion, early-stop counter logic, empty page retry, hard cap at 30 pages — **sub-agent with spec only**
- [x] 4.3 Create `src/scraper/collect-hrefs.ts` — `collectHrefs(page, db, config)`: builds URL, paginates with Playwright, applies deduplication and early-stop logic, returns `string[]`
- [x] 4.4 Run tests and iterate until `collect-hrefs.test.ts` passes

## 5. Phase 2 — Detail Page Scraping

- [x] 5.1 Create `tests/fixtures/listing-detail.html` — minimal static HTML fixture representing a booli.se detail listing page with all extractable fields
- [x] 5.2 Create `tests/scraper/scrape-detail.test.ts` — test full field extraction from fixture, null for missing optional fields, booli_id and listing_type parsed from href, retry-once-then-skip behaviour — **sub-agent with spec only**
- [x] 5.3 Create `src/scraper/scrape-detail.ts` — `scrapeDetailPage(page, href)`: loads detail page, extracts all listing fields, returns `NewListing | null` on unrecoverable failure
- [x] 5.4 Run tests and iterate until `scrape-detail.test.ts` passes

## 6. Concurrency Pool

- [x] 6.1 Create `tests/scraper/run-phase2.test.ts` — test that at most 3 detail pages are in-flight concurrently, all hrefs are processed, and per-tab delay is applied — **sub-agent with spec only**
- [x] 6.2 Create `src/scraper/run-phase2.ts` — `runPhase2(browser, hrefs, db)`: manages a pool of 3 Playwright tabs, distributes hrefs across tabs, applies per-tab delay, inserts results into DB
- [x] 6.3 Run tests and iterate until `run-phase2.test.ts` passes

## 7. Public API

- [x] 7.1 Create `src/scraper/index.ts` — export `runScraper(db, config)` which launches one browser, runs phase 1 then phase 2, closes browser; re-export `collectHrefs`, `scrapeDetailPage`, `runPhase2` for testing
