## Purpose

Provides a self-bootstrapping SQLite storage layer for all pipeline data: listings, scores, AI analyses, and run records. Handles deduplication, typed retrieval, and test isolation via in-memory databases.

## Requirements

### Requirement: Database initialisation
The storage module SHALL create all required tables on first use via `CREATE TABLE IF NOT EXISTS`, making the database self-bootstrapping with no manual setup step.

#### Scenario: Fresh database
- **WHEN** `initDatabase` is called with a path to a non-existent file
- **THEN** the file is created and all four tables (`listings`, `scores`, `analyses`, `runs`) exist

#### Scenario: Existing database
- **WHEN** `initDatabase` is called on a database that already has the tables
- **THEN** it completes without error and existing data is preserved

---

### Requirement: Listing deduplication
The storage module SHALL prevent duplicate listings via a unique constraint on `(booli_id, listing_type)`. Attempting to insert a duplicate SHALL be a no-op, not an error.

#### Scenario: Insert new listing
- **WHEN** a listing with a `(booli_id, listing_type)` pair not yet in the database is inserted
- **THEN** the listing is stored and its generated `id` is returned

#### Scenario: Insert duplicate listing
- **WHEN** a listing with an already-existing `(booli_id, listing_type)` pair is inserted
- **THEN** no row is inserted and no error is thrown

---

### Requirement: Listing retrieval
The storage module SHALL provide a function to retrieve listings by `id`, and a function to retrieve all listings inserted since a given timestamp.

#### Scenario: Get listing by id
- **WHEN** `getListingById` is called with a valid `id`
- **THEN** the full listing row is returned, typed and validated

#### Scenario: Get listing by id — not found
- **WHEN** `getListingById` is called with an `id` that does not exist
- **THEN** `null` is returned

#### Scenario: Get listings since timestamp
- **WHEN** `getListingsSince` is called with a timestamp
- **THEN** all listings with `scraped_at >= timestamp` are returned as a typed array

---

### Requirement: Score persistence
The storage module SHALL store a score record for a listing, including the total score and a JSON breakdown of individual rule contributions.

#### Scenario: Insert score
- **WHEN** `insertScore` is called with a valid `listing_id` and score data
- **THEN** the score row is stored and its generated `id` is returned

#### Scenario: Get score for listing
- **WHEN** `getScoreByListingId` is called with a `listing_id`
- **THEN** the most recent score row for that listing is returned

---

### Requirement: Analysis persistence
The storage module SHALL store the agent analysis result for a listing as a JSON blob.

#### Scenario: Insert analysis
- **WHEN** `insertAnalysis` is called with a valid `listing_id` and result JSON
- **THEN** the analysis row is stored and its generated `id` is returned

#### Scenario: Get analysis for listing
- **WHEN** `getAnalysisByListingId` is called with a `listing_id`
- **THEN** the analysis row is returned, or `null` if none exists

---

### Requirement: Run tracking
The storage module SHALL record each pipeline run with its start time, end time, counts of processed entities, and whether the notification was sent.

#### Scenario: Start run
- **WHEN** `insertRun` is called with `started_at`
- **THEN** a run row is created with `completed_at` as null and all counts as zero

#### Scenario: Complete run
- **WHEN** `updateRun` is called with a run `id` and completion data
- **THEN** the row is updated with `completed_at`, counts, and `notification_sent`

---

### Requirement: In-memory database for tests
The storage module SHALL accept a database path at initialisation time, allowing tests to pass `:memory:` to get an isolated, ephemeral database with no filesystem side effects.

#### Scenario: In-memory initialisation
- **WHEN** `initDatabase` is called with `":memory:"`
- **THEN** a fully functional in-memory database is returned, identical in behaviour to a file-backed one
