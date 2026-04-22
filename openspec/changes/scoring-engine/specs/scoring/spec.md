## ADDED Requirements

### Requirement: Area price resolution
The scoring module SHALL resolve a listing's location to an area average price per m² (SEK) using a three-tier static fallback: (1) neighbourhood alias table, (2) postal code prefix table, (3) municipality fallback. If all three resolve to null, the area price is considered unknown.

#### Scenario: Neighbourhood resolves directly
- **WHEN** `resolveAreaPrice` is called with a neighbourhood string that exists in the district map (e.g. "Vasastan")
- **THEN** the average price per m² for that district is returned

#### Scenario: Sub-neighbourhood resolves via alias
- **WHEN** `resolveAreaPrice` is called with a granular neighbourhood name (e.g. "SoFo")
- **THEN** it is mapped to its parent district and that district's price per m² is returned

#### Scenario: Unknown neighbourhood falls back to postal code
- **WHEN** `resolveAreaPrice` is called with an unrecognised neighbourhood but a valid postal code
- **THEN** the postal code prefix is used to resolve the district and its price per m² is returned

#### Scenario: Unknown neighbourhood and postal code falls back to municipality
- **WHEN** `resolveAreaPrice` is called with an unrecognised neighbourhood and unrecognised postal code but a known municipality
- **THEN** the municipality fallback price per m² is returned

#### Scenario: All lookups fail
- **WHEN** `resolveAreaPrice` is called with neighbourhood, postal code, and municipality all null or unrecognised
- **THEN** `null` is returned

---

### Requirement: Deterministic listing scoring
The scoring module SHALL score a listing on a 0–100 integer scale by summing the contributions of the following rules. Each rule is null-safe: if required fields are null, the rule contributes 0.

| Rule | Max points |
|---|---|
| `area_value` | 20 |
| `deal_quality` | 18 |
| `fee_per_m2` | 15 |
| `size_and_rooms` | 12 |
| `floor_and_elevator` | 9 |
| `balcony_or_patio` | 9 |
| `construction_era` | 7 |
| `booli_estimate_confidence` | 5 |
| `fireplace` | 3 |
| `storage` | 2 |

#### Scenario: Fully-populated listing produces score in range
- **WHEN** `scoreListing` is called with a listing where all scorable fields are populated
- **THEN** the returned `total_score` is an integer between 0 and 100 inclusive

#### Scenario: Null fields do not throw
- **WHEN** `scoreListing` is called with a listing where optional fields (floor, construction_year, monthly_fee, etc.) are null
- **THEN** the function returns a valid score without throwing, with null rules contributing 0

#### Scenario: Rule breakdown is complete
- **WHEN** `scoreListing` is called
- **THEN** the returned `rule_breakdown` object contains an entry for every rule, with its point contribution or null if the rule could not be evaluated

---

### Requirement: area_value rule
The area_value rule SHALL award points based on the neighbourhood's tier in the Stockholm price map.

#### Scenario: Tier 1 neighbourhood scores maximum
- **WHEN** a listing resolves to a Tier 1 district (e.g. Vasastan, Östermalm, Södermalm)
- **THEN** `area_value` contributes 20 points

#### Scenario: Tier 5 neighbourhood scores minimum
- **WHEN** a listing resolves to a Tier 5 district (e.g. Spånga/Kista, Rinkeby/Tensta)
- **THEN** `area_value` contributes 0 points

#### Scenario: Unknown area contributes zero
- **WHEN** area price resolution returns null
- **THEN** `area_value` contributes 0 points

---

### Requirement: deal_quality rule
The deal_quality rule SHALL compare `list_price / living_area_m2` against both the resolved area average price per m² and `booli_estimate_mid / living_area_m2`, awarding more points for listings priced below area norms and Booli's estimate.

#### Scenario: Listing priced well below area average scores high
- **WHEN** `list_price / living_area_m2` is less than 85% of the area average price per m²
- **THEN** `deal_quality` contributes its maximum points from the area comparison component

#### Scenario: Listing priced above area average scores zero on area component
- **WHEN** `list_price / living_area_m2` exceeds the area average price per m² by more than 15%
- **THEN** the area comparison component contributes 0 points

#### Scenario: Listing priced below Booli estimate scores high on estimate component
- **WHEN** `list_price` is less than `booli_estimate_mid`
- **THEN** the Booli estimate component contributes positively

#### Scenario: Both area price and Booli estimate null
- **WHEN** area price is null and `booli_estimate_mid` is null
- **THEN** `deal_quality` contributes 0 points

---

### Requirement: fee_per_m2 rule
The fee_per_m2 rule SHALL normalise the monthly fee per square metre of living area and award points inversely — lower fees score higher.

#### Scenario: Low fee scores maximum
- **WHEN** monthly fee per m² is below 500 SEK/m²/year (≈42 SEK/m²/month)
- **THEN** `fee_per_m2` contributes maximum points

#### Scenario: Very high fee scores zero
- **WHEN** monthly fee per m² exceeds 1200 SEK/m²/year (≈100 SEK/m²/month)
- **THEN** `fee_per_m2` contributes 0 points

#### Scenario: Missing fee contributes zero
- **WHEN** `monthly_fee` or `living_area_m2` is null
- **THEN** `fee_per_m2` contributes 0 points

---

### Requirement: floor_and_elevator rule
The floor_and_elevator rule SHALL score the combination of floor level and elevator presence. Higher floors with elevator score highest; higher floors without elevator are penalised.

#### Scenario: High floor with elevator scores maximum
- **WHEN** floor is 4 or above and `has_elevator` is true
- **THEN** `floor_and_elevator` contributes maximum points

#### Scenario: High floor without elevator is penalised
- **WHEN** floor is 4 or above and `has_elevator` is false
- **THEN** `floor_and_elevator` contributes 0 points

#### Scenario: Ground floor scores low
- **WHEN** floor is 1
- **THEN** `floor_and_elevator` contributes 2 points or fewer

#### Scenario: Mid floor scores moderately regardless of elevator
- **WHEN** floor is 2 or 3
- **THEN** `floor_and_elevator` contributes a mid-range score

#### Scenario: Missing floor contributes zero
- **WHEN** `floor` is null
- **THEN** `floor_and_elevator` contributes 0 points

---

### Requirement: construction_era rule
The construction_era rule SHALL award points based on the building era, favouring pre-1930 character buildings and post-1999 modern builds, and penalising the 1960–1979 miljonprogrammet era.

#### Scenario: Pre-1930 scores high
- **WHEN** `construction_year` is before 1930
- **THEN** `construction_era` contributes 7 points

#### Scenario: 1960–1979 scores lowest
- **WHEN** `construction_year` is between 1960 and 1979 inclusive
- **THEN** `construction_era` contributes 2 points or fewer

#### Scenario: Post-1999 scores high
- **WHEN** `construction_year` is 2000 or later
- **THEN** `construction_era` contributes 6 points or more

#### Scenario: Missing construction year contributes zero
- **WHEN** `construction_year` is null
- **THEN** `construction_era` contributes 0 points

---

### Requirement: Score persistence
The scoring module SHALL persist each listing's score and rule breakdown to the `scores` table. A listing is only scored once; listings already present in the `scores` table are skipped.

#### Scenario: Score is inserted for unscored listing
- **WHEN** `runScoring` is called and a listing has no existing score row
- **THEN** a row is inserted into `scores` with the listing's `total_score` and `rule_breakdown` JSON

#### Scenario: Already-scored listing is skipped
- **WHEN** `runScoring` is called and a listing already has a score row
- **THEN** no new score row is inserted and the existing score is unchanged

#### Scenario: All unscored listings are processed
- **WHEN** `runScoring` is called with N unscored listings in the DB
- **THEN** all N listings receive a score row after the call completes

---

### Requirement: Pipeline integration
The scoring module SHALL expose a `runScoring(db)` function that the pipeline entry point calls after scraping completes.

#### Scenario: runScoring processes all unscored listings
- **WHEN** `runScoring(db)` is called after a scrape run
- **THEN** every listing in the `listings` table without a corresponding `scores` row is scored and persisted

#### Scenario: runScoring with no unscored listings is a no-op
- **WHEN** `runScoring(db)` is called and all listings already have scores
- **THEN** the function completes without inserting any rows or throwing
