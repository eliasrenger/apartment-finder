## Context

The scraper produces structured listing rows in SQLite. Every field that can be deterministically scored has been mapped: size, rooms, floor, elevator, balcony, patio, fireplace, storage, construction year, monthly fee, list price, and Booli's estimate range. Two fields require special resolution logic: location (neighbourhood → area price) and deal quality (list price vs area norm and vs Booli estimate). Three blind spots cannot be scored deterministically: BRF financial health, renovation condition, and light orientation — these are delegated to the AI agent layer.

## Goals / Non-Goals

**Goals:**
- Score every listing on a 0–100 scale with a deterministic, reproducible algorithm
- Persist score + full rule breakdown JSON to the `scores` table
- Resolve neighbourhood/postal code/municipality to a Stockholm area price tier via a static three-tier fallback
- Expose a `runScoring(db)` function the pipeline entry point calls after scraping

**Non-Goals:**
- Configurable weights at runtime
- Geocoding or external API calls
- Scoring fields not present in the `listings` schema
- Re-scoring already-scored listings (each run only scores new listings)

## Decisions

### Score range: 0–100, integer
**Decision:** Total score is an integer 0–100.
**Rationale:** Simple to reason about, easy to threshold (e.g., "AI-analyse listings scoring ≥ 65"). Stored as `total_score INTEGER` in the existing schema.
**Alternative considered:** Raw weighted sum with no normalisation. Rejected — hard to set thresholds and compare across rule weight changes.

### Rule breakdown stored as JSON string
**Decision:** `rule_breakdown` column stores a JSON object: `{ ruleName: points, … }`.
**Rationale:** Already in schema. Allows the AI agent and notifier to explain why a listing scored well without re-running the scorer. Example: `{ "area_value": 18, "deal_quality": 12, "fee_per_m2": 8, … }`.

### Additive weighted rules, no hard disqualifiers in the scorer
**Decision:** All rules contribute additively. No single rule returns a score of 0 or disqualifies a listing outright.
**Rationale:** Hard disqualifiers belong in a pre-filter (future `src/filter/` module). The scorer's job is to rank, not gate. A listing with a terrible fee but great location should still surface with a low score rather than disappear — the user can see the breakdown.
**Alternative considered:** Hard penalties (e.g., fee > 1500 SEK/m² → score = 0). Rejected for this layer; will revisit in filter module.

### Null-safe rules
**Decision:** Any rule whose required fields are null contributes 0 points and records `null` in the breakdown.
**Rationale:** Many fields are nullable (floor, construction_year, etc.). Skipping rather than throwing keeps the scorer robust to partially-scraped listings.

### Area price resolution: three-tier static lookup
**Decision:** neighbourhood alias table → postal code prefix table → municipality fallback. All three are static TypeScript objects, no DB queries.
**Rationale:** No external API dependency, deterministic, fast, easy to update. The alias table covers granular booli neighbourhood names (e.g., "SoFo" → "Södermalm"). Postal code prefix covers nulls and unknowns. Municipality is the last resort.
**If all three resolve to null:** the area_value rule contributes 0 and the deal quality rule falls back to Booli estimate only.

### Rule weights and max points

The 100-point budget is allocated across rules by importance:

| Rule | Max points | Basis |
|---|---|---|
| `area_value` | 20 | Neighbourhood tier (1–5) mapped to 0–20 |
| `deal_quality` | 18 | list_price vs area avg AND vs Booli estimate_mid |
| `fee_per_m2` | 15 | Monthly fee normalised per m², tiered |
| `size_and_rooms` | 12 | m² range + room count sweet spots |
| `floor_and_elevator` | 9 | Floor level adjusted for elevator presence |
| `balcony_or_patio` | 9 | Boolean, patio slightly less than balcony |
| `construction_era` | 7 | Era bucket — pre-1930 and 2000+ both score well |
| `booli_estimate_confidence` | 5 | Width of estimate range as confidence proxy |
| `fireplace` | 3 | Boolean bonus |
| `storage` | 2 | Boolean bonus |

Total max: 100 points.

### `runScoring(db)` scopes to unscored listings only
**Decision:** Query listings that have no row in `scores` table. Score them, insert, move on.
**Rationale:** Idempotent re-runs don't waste compute or create duplicate scores. A listing scored in a previous run is not re-scored even if it's still on the market.

## Risks / Trade-offs

**Area price data goes stale** → Hardcoded 2024–2025 figures. Mitigation: document update cadence; prices move slowly enough that annual review is sufficient.

**Neighbourhood alias table is incomplete** → Booli uses ~200+ granular neighbourhood names; we won't map them all upfront. Mitigation: postal code fallback covers misses; log unresolved neighbourhood names so they can be added over time.

**Score distribution may cluster** → If most listings score 40–60 the threshold loses meaning. Mitigation: review score distributions after first real run and tune weights if needed.

**Booli estimate_mid is null on some listings** → deal_quality rule partially degrades to area comparison only. Acceptable.

## Migration Plan

1. Implement and test `src/scoring/` module in isolation
2. Wire `runScoring(db)` into `src/index.ts` after `runScraper`
3. On first real run, review score distribution; tune weights if needed

## Open Questions

- Should `runScoring` accept a minimum score threshold to pass to the agent, or should the agent runner query the scores table itself?
- Should unresolved neighbourhood names be logged as structured warnings so they can be added to the alias table incrementally?
