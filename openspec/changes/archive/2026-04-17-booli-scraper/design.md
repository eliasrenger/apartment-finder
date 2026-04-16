## Context

booli.se is a JS-heavy site that requires a real browser to render listing data. The scraper is the first stage of the pipeline and runs once per day. It must collect new listings without hammering the site, handle partial failures gracefully, and stop early when it detects it has already seen most of what is available.

## Goals / Non-Goals

**Goals:**
- Build a valid booli.se search URL from a validated config
- Paginate search results and collect hrefs to new listings only
- Scrape each detail page and return a structured listing record
- Stop early when the page stream is predominantly seen listings
- Be polite to booli.se with internal request delays

**Non-Goals:**
- No proxy, authentication, or cookie management
- No scheduling — invocation is the scheduler's responsibility
- No scoring, filtering beyond the URL query, or analysis

## Decisions

### Playwright over fetch/cheerio
booli.se renders listing data client-side. A plain HTTP fetch returns a shell HTML page with no listing content. Playwright with headless Chromium is required. No alternative is viable.

### Two-phase design (href collection → detail scraping)
Separating href collection from detail scraping makes each phase independently testable with HTML fixtures and keeps retry logic isolated per phase. It also enables the early-stop deduplication check to happen before any expensive detail page loads.

### In-memory href list between phases
With a 30-page hard cap and ~20 listings per page, the maximum href list is ~600 strings — well within acceptable memory. Persisting hrefs to the DB between phases adds complexity with no benefit for a single-process pipeline.

### Deduplication at href parse time (phase 1)
Checking `(booli_id, listing_type)` against the DB as hrefs are collected means the early-stop logic operates on truly new listings. This avoids loading detail pages for listings we already have.

### Early-stop: 3 consecutive pages with <10% new hrefs
A rolling counter of consecutive low-yield pages balances thoroughness against wasted requests. 3 pages is enough signal to be confident remaining pages are all old listings. The 10% threshold accounts for occasional new listings mixed into older result pages.

### Phase 1 is sequential, phase 2 runs 3 concurrent tabs
Phase 1 pagination is inherently sequential — the result of page N determines whether to fetch page N+1. Phase 2 is embarrassingly parallel: each detail page is independent. A pool of 3 concurrent Playwright tabs is used to fetch detail pages in parallel, balancing throughput against politeness. 3 is conservative enough to avoid triggering rate limiting while meaningfully reducing total run time.

### Single shared browser instance, multiple tabs
One Playwright browser is launched at the start of the scraper run and closed when it finishes. Phase 1 uses one tab; phase 2 opens up to 3 tabs concurrently from the same browser. This minimises Chromium startup overhead and memory compared to spawning separate browsers per request.

### Internal fixed delay between requests
Delay is baked in and not user-configurable. This keeps the config surface small and prevents accidental misconfiguration that could abuse the site. A generous delay is appropriate since the service runs in the background overnight. In phase 2, the delay is applied per tab, not globally — each of the 3 concurrent tabs waits before its next request.

### Retry-once policy per phase
- Phase 1 (href page): retry once on failure, then break. A failed search page means the run is unreliable; collecting partial results and stopping is safer than continuing with gaps.
- Phase 2 (detail page): retry once on failure, then skip and continue. A single listing failure should not abort the run.

### `objectType` as a validated enum
booli.se accepts specific Swedish strings for `objectType`. Validating against an explicit enum at config load time catches misconfiguration before any browser is launched.

## Risks / Trade-offs

- **Selector fragility** — booli.se can change its DOM at any time, breaking extraction. Mitigation: all selectors are isolated in a single `selectors.ts` constants file so breakages are easy to locate and fix.
- **Rate limiting / blocking** — aggressive scraping could get the IP blocked. Mitigation: generous fixed delay between requests.
- **Playwright cold start** — launching Chromium takes a few seconds. Acceptable for a background daily job.
- **Empty fields** — not all listings expose every field (floor, operating_cost, etc.). Mitigation: all optional fields are nullable; extraction returns `null` rather than throwing on missing data.
