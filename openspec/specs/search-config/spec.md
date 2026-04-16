## ADDED Requirements

### Requirement: Search config schema validation
The config module SHALL define a Zod schema for the search section of the user-facing `config.yaml` and validate it at load time. Invalid config SHALL throw a typed error with a descriptive message before any scraping begins.

#### Scenario: Valid config loads successfully
- **WHEN** `loadSearchConfig` is called with a valid config.yaml containing all required fields
- **THEN** a validated `SearchConfig` object is returned with correct TypeScript types

#### Scenario: Invalid objectType is rejected
- **WHEN** `loadSearchConfig` is called with an `objectType` value not in the allowed set
- **THEN** a typed validation error is thrown before any scraping begins

#### Scenario: Missing required field is rejected
- **WHEN** `loadSearchConfig` is called with a config.yaml missing a required field (e.g. `areaIds`)
- **THEN** a typed validation error is thrown with a message identifying the missing field

---

### Requirement: Search URL construction
The config module SHALL expose a `buildSearchUrl` function that constructs a valid booli.se search URL from a `SearchConfig` and a page number.

#### Scenario: URL contains all config parameters
- **WHEN** `buildSearchUrl` is called with a full `SearchConfig` and `page=1`
- **THEN** the returned URL contains `areaIds`, `extendAreas`, `objectType`, price range, area range, room range, and `page=1` as query parameters

#### Scenario: Pagination increment
- **WHEN** `buildSearchUrl` is called with `page=3`
- **THEN** the returned URL contains `page=3`

#### Scenario: objectType is URL-encoded
- **WHEN** `buildSearchUrl` is called with `objectType: "Lägenhet"`
- **THEN** the returned URL contains the correctly percent-encoded value

---

### Requirement: Allowed objectType values
The config module SHALL restrict `objectType` to the following values: `Lägenhet`, `Villa`, `Gård`, `Fritidshus`, `Kedjehus-Parhus-Radhus`, `Tomt/Mark`.

#### Scenario: Each allowed value is accepted
- **WHEN** `loadSearchConfig` is called with any of the six allowed `objectType` values
- **THEN** validation passes without error

#### Scenario: Unlisted value is rejected
- **WHEN** `loadSearchConfig` is called with `objectType: "Bungalow"`
- **THEN** a validation error is thrown
