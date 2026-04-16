## 1. Zod Schemas and TypeScript Types

- [x] 1.1 Create `tests/storage/schemas.test.ts` — test that valid row data passes validation and invalid data throws
- [x] 1.2 Create `src/storage/schemas.ts` — define Zod schemas for `Listing`, `Score`, `Analysis`, and `Run` rows; export inferred TypeScript types
- [x] 1.3 Run tests and iterate until `schemas.test.ts` passes

## 2. Database Initialisation

- [x] 2.1 Create `tests/storage/db.test.ts` — test fresh init creates all tables, test re-init on existing db preserves data, test `:memory:` path works
- [x] 2.2 Create `src/storage/db.ts` — `initDatabase(path: string): Database` that opens the SQLite connection and runs `CREATE TABLE IF NOT EXISTS` for all four tables
- [x] 2.3 Run tests and iterate until `db.test.ts` passes

## 3. Listings Repository

- [x] 3.1 Create `tests/storage/listings.test.ts` — test insert, deduplication no-op, get by id (found and not found), get since timestamp
- [x] 3.2 Create `src/storage/listings.ts` — `insertListing`, `getListingById`, `getListingsSince` functions; deduplication via `INSERT OR IGNORE`
- [x] 3.3 Run tests and iterate until `listings.test.ts` passes

## 4. Scores Repository

- [x] 4.1 Create `tests/storage/scores.test.ts` — test insert and retrieval of score with rule breakdown JSON
- [x] 4.2 Create `src/storage/scores.ts` — `insertScore`, `getScoreByListingId` functions
- [x] 4.3 Run tests and iterate until `scores.test.ts` passes

## 5. Analyses Repository

- [x] 5.1 Create `tests/storage/analyses.test.ts` — test insert and retrieval, test null return when no analysis exists
- [x] 5.2 Create `src/storage/analyses.ts` — `insertAnalysis`, `getAnalysisByListingId` functions
- [x] 5.3 Run tests and iterate until `analyses.test.ts` passes

## 6. Runs Repository

- [x] 6.1 Create `tests/storage/runs.test.ts` — test run creation with null completed_at, test update with counts and email_sent flag
- [x] 6.2 Create `src/storage/runs.ts` — `insertRun`, `updateRun` functions
- [x] 6.3 Run tests and iterate until `runs.test.ts` passes

## 7. Public API

- [x] 7.1 Create `src/storage/index.ts` — re-export all public functions and types from the storage module
