## ADDED Requirements

### Requirement: Analyse top-scored unanalysed listings
The system SHALL run the agent against every listing where `total_score >= config.analysis.scoreThreshold` and no row exists in the `analyses` table for that listing.

#### Scenario: Listing meets threshold and is unanalysed
- **WHEN** `runAnalysis(db, config)` is called and a listing has `total_score >= scoreThreshold` with no existing analysis
- **THEN** the agent runs for that listing and a row is inserted into `analyses` with the result

#### Scenario: Listing already analysed
- **WHEN** a listing has `total_score >= scoreThreshold` but already has a row in `analyses`
- **THEN** the listing is skipped — no new analysis is run

#### Scenario: Listing below threshold
- **WHEN** a listing has `total_score < scoreThreshold`
- **THEN** the listing is not analysed regardless of prior analysis state

---

### Requirement: Agent browses listing and BRF
The agent SHALL attempt to gather information by navigating the booli.se listing page, finding the BRF website, and reading the annual report.

#### Scenario: BRF link found on booli page
- **WHEN** the agent visits the booli.se listing URL
- **THEN** it follows the BRF link to the BRF website and attempts to find and read the annual report PDF

#### Scenario: BRF link not found on booli page
- **WHEN** the agent visits the booli.se listing URL and finds no BRF link
- **THEN** it performs a Google search using the BRF name and attempts to navigate to the BRF website from search results

#### Scenario: No BRF information found anywhere
- **WHEN** neither the booli page nor Google search yields useful BRF information
- **THEN** the agent produces a verdict based solely on available listing data, and the explanation notes that BRF information could not be found

---

### Requirement: Agent produces a structured verdict
The agent SHALL respond with a JSON object `{ "notifyUser": boolean, "explanation": string }` stored in `analyses.result`.

#### Scenario: Financially excellent listing
- **WHEN** the agent determines the BRF economy is strong (high equity ratio, low debt/sqm, stable fees, no major pending renovations)
- **THEN** `notifyUser` is `true` regardless of lifestyle factors

#### Scenario: Decent financials with strong lifestyle
- **WHEN** financials are acceptable and lifestyle factors (floor, balcony, neighbourhood, construction era) are strong
- **THEN** `notifyUser` is `true`

#### Scenario: Strong lifestyle but weak financials
- **WHEN** lifestyle factors are strong but BRF economy is poor
- **THEN** `notifyUser` is `false`

#### Scenario: Missing BRF info but strong overall
- **WHEN** BRF information is unavailable but price, score, and lifestyle signals are all very strong
- **THEN** the agent MAY set `notifyUser` to `true` at its own discretion, and the explanation MUST note the missing BRF information

#### Scenario: Nothing stands out
- **WHEN** no aspect of the listing is particularly strong
- **THEN** `notifyUser` is `false`

---

### Requirement: Agent respects maxSteps limit
The agent SHALL NOT exceed `config.analysis.maxSteps` tool calls per listing analysis.

#### Scenario: Agent reaches step limit
- **WHEN** the agent has made `maxSteps` tool calls without finishing
- **THEN** Mastra terminates the loop and the result is whatever verdict the agent can produce at that point

---

### Requirement: Shared browser instance
A single Playwright browser instance SHALL be used for all `browsePage` tool calls within a single `runAnalysis()` invocation.

#### Scenario: Multiple listings analysed in one run
- **WHEN** `runAnalysis()` processes multiple listings sequentially
- **THEN** one browser is launched before the first listing and closed after the last, shared across all tool calls
