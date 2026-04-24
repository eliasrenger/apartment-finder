## ADDED Requirements

### Requirement: Analysis config block
The config schema SHALL include an `analysis` block with `scoreThreshold` (integer, default 70) and `maxSteps` (integer, default 20).

#### Scenario: Valid analysis config loads
- **WHEN** `config.yaml` contains a valid `analysis` block with `scoreThreshold` and `maxSteps`
- **THEN** `loadSearchConfig` returns a config object with `analysis.scoreThreshold` and `analysis.maxSteps` as integers

#### Scenario: Analysis block omitted
- **WHEN** `config.yaml` has no `analysis` block
- **THEN** `loadSearchConfig` returns defaults: `scoreThreshold: 70`, `maxSteps: 20`

#### Scenario: Invalid scoreThreshold is rejected
- **WHEN** `scoreThreshold` is not an integer or is outside a valid range (e.g. negative)
- **THEN** a typed validation error is thrown at startup
