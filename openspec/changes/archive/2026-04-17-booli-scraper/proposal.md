## Why

The pipeline has no way to collect apartment listings yet. The scraper is the entry point for all data — without it, nothing else in the pipeline can run.

## What Changes

- Introduce a two-phase scraper module at `src/scraper/`
- Introduce a search config module at `src/config/` with a Zod schema for the user-facing `config.yaml` search section
- Add Playwright as a dependency for headless Chromium rendering

## Capabilities

### New Capabilities

- `scraper`: Two-phase booli.se scraper — phase 1 collects listing hrefs from paginated search results; phase 2 scrapes each detail page and extracts all listing fields
- `search-config`: Zod schema and loader for the search/filter section of the user-facing `config.yaml`

### Modified Capabilities

_(none)_

## Non-goals

- No scoring, analysis, or notification logic
- No scheduling — the scraper is invoked by the scheduler, not self-scheduling
- No proxy or authentication support
- No parsing of BRF financial documents (that belongs to the agent stage)

## Impact

- Touches: scraper stage (`src/scraper/`), config stage (`src/config/`)
- New dependency: `playwright` (headless Chromium)
- Depends on: storage module (`src/storage/`) for deduplication lookups and listing inserts
- Consumed by: scoring stage (next pipeline step)
