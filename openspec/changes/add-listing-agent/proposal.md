## Why

The pipeline scrapes and scores listings but stops short of acting on them — a human still has to check every high-scoring listing manually. Adding an agent that browses the realtor page, researches the BRF economy, and produces a notify/don't-notify verdict closes that loop: the user only hears about listings that genuinely warrant attention.

## What Changes

- New `src/agent/` module: Mastra agent with three browser/web tools that analyses top-scored listings and writes results to the `analyses` table
- New `src/notifier/discord.ts`: sends a Discord message per listing where `notifyUser: true`
- `src/index.ts` extended: calls `runAnalysis(db, config)` then `runNotifier(db)` after scoring
- `config.yaml` extended: new `analysis.scoreThreshold` (default 70) and `analysis.maxSteps` (default 20)
- New dependencies: `@mastra/core`, PDF extraction library

## Capabilities

### New Capabilities
- `listing-agent`: Mastra agent that browses the web to research a listing and produces a `{ notifyUser, explanation }` verdict stored in the `analyses` table
- `discord-notifier`: Sends Discord notifications for listings where the agent decided `notifyUser: true`

### Modified Capabilities
- `search-config`: New `analysis` block added to config schema — `scoreThreshold` and `maxSteps`

## Impact

- `src/index.ts`: two new pipeline steps after `runScoring`
- `src/agent/`: new module, no changes to existing modules
- `src/notifier/`: new module
- `config.yaml` + config schema: new `analysis` section
- `analyses` table: already exists in storage schema, no migration needed
- New npm dependencies: `@mastra/core`, PDF library
- `ANTHROPIC_API_KEY` already required by the pipeline; no new secrets needed for the agent itself
- `DISCORD_WEBHOOK` already a GitHub Actions secret; used by the notifier

## Non-goals

- No retry logic — one analysis attempt per listing per run
- No streaming — `agent.generate()` only
- No web UI changes for the agent output (viewer already reads `analyses` table)
- No authentication on external sites
