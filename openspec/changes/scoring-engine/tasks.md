## 1. Area price data and resolution

- [x] 1.1 Write tests for `resolveAreaPrice` covering: direct neighbourhood match, alias sub-neighbourhood, postal code fallback, municipality fallback, all-null → null
- [x] 1.2 Create `src/scoring/area-prices.ts` with Stockholm district price map (Tier 1–5), neighbourhood alias table, postal code prefix table, and municipality fallback
- [x] 1.3 Create `src/scoring/resolve-area.ts` exporting `resolveAreaPrice(neighbourhood, postalCode, municipality): number | null` with three-tier lookup
- [x] 1.4 Run tests and iterate until all resolution tests pass

## 2. Individual scoring rules

- [x] 2.1 Write tests for all rules in `tests/scoring/rules.test.ts`: area_value, deal_quality, fee_per_m2, size_and_rooms, floor_and_elevator, balcony_or_patio, construction_era, booli_estimate_confidence, fireplace, storage — covering max points, zero points, and null-field cases
- [x] 2.2 Create `src/scoring/rules.ts` implementing all 10 scoring rules, each null-safe and returning a `{ points: number | null }` result
- [x] 2.3 Run rule tests and iterate until all pass

## 3. Score aggregator

- [x] 3.1 Write tests for `scoreListing` in `tests/scoring/score-listing.test.ts`: fully-populated listing produces integer 0–100, null fields contribute 0 without throwing, rule_breakdown contains an entry for every rule
- [x] 3.2 Create `src/scoring/score-listing.ts` exporting `scoreListing(listing): { total_score: number; rule_breakdown: Record<string, number | null> }` that sums all rule contributions
- [x] 3.3 Run aggregator tests and iterate until all pass

## 4. Pipeline runner and persistence

- [x] 4.1 Write tests for `runScoring` in `tests/scoring/run-scoring.test.ts`: unscored listings get a score row inserted, already-scored listings are skipped, all N unscored listings are processed, no-op when none are unscored
- [x] 4.2 Create `src/scoring/run-scoring.ts` exporting `runScoring(db: Database): void` that queries unscored listings, scores each, inserts into the `scores` table
- [x] 4.3 Run runner tests and iterate until all pass

## 5. Module export and pipeline integration

- [x] 5.1 Create `src/scoring/index.ts` re-exporting `runScoring` and `scoreListing`
- [x] 5.2 Update `src/index.ts` to call `runScoring(db)` after `runScraper`
- [x] 5.3 Run full test suite (`bun test`) and confirm no regressions
