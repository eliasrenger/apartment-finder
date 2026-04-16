## Context

The project has no persistence layer yet. All pipeline stages (scraper, scoring, agent, notifier) need a stable storage foundation before they can be implemented. This design establishes the SQLite schema and the TypeScript storage module that all other stages will depend on.

## Goals / Non-Goals

**Goals:**
- Define the full SQLite schema (4 tables) with appropriate types, constraints, and indices
- Provide a typed storage module with repository functions for each table
- Validate all data at the boundary using Zod before writing to or returning from the database
- Support deduplication of listings across daily runs

**Non-Goals:**
- No migration system — schema is created once via `CREATE TABLE IF NOT EXISTS`
- No ORM or query builder
- No full-text search or advanced query capabilities
- No connection pooling — single SQLite connection per process is sufficient

## Decisions

### Use `bun:sqlite` directly over a library (e.g. better-sqlite3, drizzle)
Bun's built-in SQLite driver is synchronous, zero-dependency, and fast. Adding an ORM or query builder would introduce abstraction overhead with no benefit at this scale. Raw SQL keeps queries explicit and auditable.

### Single database file at `data/apartments.db`
The path is derived from an environment variable with a sensible default. This makes it trivially swappable for an in-memory database (`:memory:`) in tests without any mocking infrastructure.

### Zod schemas as the single source of truth for types
Zod schemas are defined first; TypeScript types are inferred from them (`z.infer<>`). This ensures runtime validation and static types stay in sync. Validated on insert and on read.

### Nullable vs optional columns
Fields that may not be present on a listing (e.g. `floor`, `total_floors`, `showing_date`, `operating_cost`) are `NULL`able in SQLite and typed as `T | null` in TypeScript. No sentinel values (e.g. `-1`, `""`).

### `listing_type` as a string enum (`bostad` | `annons`)
The path prefix on booli.se URLs (`/bostad/` vs `/annons/`) is part of the unique identity of a listing. Stored as a constrained string rather than a boolean to remain readable and extensible.

### `rule_breakdown` and `result` stored as JSON text
Scoring rule breakdowns and agent analysis results are semi-structured and will evolve independently. Storing as JSON text in SQLite avoids schema churn while keeping them queryable if needed.

## Risks / Trade-offs

- **SQLite write concurrency** — SQLite allows only one writer at a time. Acceptable since the pipeline runs sequentially once per day; not a risk in practice.
- **Schema evolution** — No migration system means any future column addition requires a manual `ALTER TABLE` or a fresh database. Acceptable for a personal-use service; document clearly.
- **JSON columns are opaque to SQL queries** — `rule_breakdown` and `result` cannot be filtered via SQL. Acceptable since queries on these fields are not required.
