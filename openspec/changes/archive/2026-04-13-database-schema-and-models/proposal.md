## Why

No persistent storage exists yet. Before any pipeline stage can run, the project needs a database schema and typed data models so that listings, scores, agent analyses, and run history can be stored and retrieved reliably.

## What Changes

- Introduce SQLite database initialisation with `bun:sqlite`
- Define four tables: `listings`, `scores`, `analyses`, `runs`
- Provide typed TypeScript interfaces and Zod schemas for all table rows
- Provide a storage module with CRUD operations used by all pipeline stages

## Capabilities

### New Capabilities

- `storage`: SQLite-backed persistence layer — schema initialisation, typed models, and repository functions for listings, scores, analyses, and runs

### Modified Capabilities

_(none — this is a greenfield project)_

## Non-goals

- No migration system — schema is created fresh on first run
- No ORM — raw `bun:sqlite` queries only
- No caching layer

## Impact

- Touches: storage pipeline stage (`src/storage/`)
- All other pipeline stages (scraper, scoring, agent, notifier) depend on this as a foundation
- Adds `bun:sqlite` usage (built-in, no new dependencies)
- Adds `zod` as a dependency for runtime validation
