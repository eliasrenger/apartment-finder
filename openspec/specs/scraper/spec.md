## Purpose

Two-phase booli.se scraper using Playwright (headless Chromium). Phase 1 paginates search results to collect new listing hrefs. Phase 2 concurrently scrapes detail pages for each href and extracts all listing fields.

## Requirements

### Requirement: Phase 1 — href collection
The scraper SHALL collect listing hrefs from booli.se search result pages by paginating through results and returning only hrefs whose `(booli_id, listing_type)` pair does not already exist in the database.

#### Scenario: New hrefs are returned
- **WHEN** `collectHrefs` is called and the search page contains listings not present in the DB
- **THEN** those hrefs are returned as a string array

#### Scenario: Already-seen hrefs are excluded
- **WHEN** a listing's `(booli_id, listing_type)` pair exists in the DB
- **THEN** its href is not included in the returned array

#### Scenario: Pagination advances page number
- **WHEN** results span multiple pages
- **THEN** `collectHrefs` requests `page=1`, `page=2`, etc. in sequence until a stop condition is met

---

### Requirement: Pagination hard cap
The scraper SHALL stop paginating after 30 pages regardless of other conditions.

#### Scenario: Hard cap is enforced
- **WHEN** pagination reaches page 30 without any other stop condition
- **THEN** no further pages are requested

---

### Requirement: Early-stop on low new-listing yield
The scraper SHALL stop paginating when fewer than 10% of hrefs on a page are new, for 3 consecutive pages.

#### Scenario: Early stop triggers after 3 low-yield pages
- **WHEN** 3 consecutive pages each yield fewer than 10% new hrefs
- **THEN** pagination stops and no further pages are requested

#### Scenario: Counter resets on a high-yield page
- **WHEN** a page yields ≥10% new hrefs after one or two low-yield pages
- **THEN** the consecutive low-yield counter resets to zero

---

### Requirement: Empty page handling
The scraper SHALL retry once when a search page returns no hrefs. If the retry also returns no hrefs, pagination stops. If this occurs on page 1, a warning SHALL be logged.

#### Scenario: Empty page retried once
- **WHEN** a search page returns no hrefs
- **THEN** the scraper retries the same page once before stopping

#### Scenario: Page 1 empty triggers warning
- **WHEN** page 1 returns no hrefs after retry
- **THEN** a structured warning log entry is emitted before stopping

#### Scenario: Empty page mid-run stops pagination
- **WHEN** a page beyond page 1 returns no hrefs after retry
- **THEN** pagination stops without a warning

---

### Requirement: Phase 1 failure handling
The scraper SHALL retry a search page once on load or parse failure. If the retry fails, pagination stops immediately.

#### Scenario: Failed page retried once then stops
- **WHEN** a search page fails to load
- **THEN** the scraper retries once; if the retry also fails, pagination stops and collected hrefs so far are returned

---

### Requirement: Phase 2 — concurrent detail page scraping
The scraper SHALL scrape detail pages concurrently using a pool of exactly 3 Playwright tabs within a single shared browser instance. All hrefs are processed; the concurrency limit controls how many are in-flight at once.

#### Scenario: At most 3 tabs open concurrently
- **WHEN** phase 2 begins with more than 3 hrefs
- **THEN** no more than 3 detail pages are loaded simultaneously at any point

#### Scenario: All hrefs are eventually processed
- **WHEN** phase 2 runs with N hrefs
- **THEN** all N hrefs are attempted regardless of concurrency batching

#### Scenario: Single browser instance reused across both phases
- **WHEN** the scraper runs
- **THEN** one Playwright browser is launched at the start and closed at the end; both phases share it

---

### Requirement: Phase 2 — detail page scraping
The scraper SHALL scrape each href from phase 1 and extract all available listing fields, returning a partial listing record where missing fields are `null`.

#### Scenario: All fields extracted when present
- **WHEN** `scrapeDetailPage` is called with an href for a listing that has all fields
- **THEN** a fully populated listing record is returned

#### Scenario: Missing optional fields returned as null
- **WHEN** a detail page does not include a field such as `floor` or `operating_cost`
- **THEN** the corresponding field in the returned record is `null`, not an error

#### Scenario: booli_id and listing_type parsed from href
- **WHEN** `scrapeDetailPage` processes an href such as `/bostad/123456`
- **THEN** the returned record has `booli_id: 123456` and `listing_type: "bostad"`

---

### Requirement: Phase 2 failure handling
The scraper SHALL retry a detail page once on load or extraction failure. If the retry also fails, the listing is skipped and the scraper continues with the next href.

#### Scenario: Failed detail page retried once then skipped
- **WHEN** a detail page fails to load or parse
- **THEN** the scraper retries once; if still failing, that href is skipped and a structured error log entry is emitted

#### Scenario: Single failure does not abort the run
- **WHEN** one detail page fails after retry
- **THEN** all other hrefs continue to be scraped normally

---

### Requirement: Request politeness
The scraper SHALL pause between requests using a fixed internal delay. This delay is not user-configurable. In phase 2, the delay is applied per tab independently — each tab waits before loading its next page.

#### Scenario: Delay applied between sequential phase 1 requests
- **WHEN** the scraper fetches consecutive search result pages
- **THEN** a fixed delay is applied between each page load

#### Scenario: Delay applied per tab in phase 2
- **WHEN** a phase 2 tab finishes scraping one detail page and moves to the next
- **THEN** that tab waits the fixed delay before loading the next href
