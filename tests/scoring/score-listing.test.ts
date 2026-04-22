import { test, expect, describe } from "bun:test";
import { scoreListing } from "../../src/scoring/score-listing";
import type { Listing } from "../../src/storage/schemas";

const fullListing: Listing = {
  id: 1,
  booli_id: 1001,
  listing_type: "bostad",
  url: "https://booli.se/1001",
  published_date: "2024-01-01",
  scraped_at: "2024-01-01T06:00:00Z",
  address: "Testgatan 1",
  neighbourhood: "Vasastan",
  municipality: "Stockholm",
  postal_code: "113 45",
  brf_name: "BRF Test",
  living_area_m2: 65,
  rooms: 3,
  floor: 4,
  total_floors: 6,
  construction_year: 1925,
  list_price: 5_000_000,
  price_per_m2: 76_923,
  monthly_fee: 3_500,
  operating_cost: null,
  booli_estimate_low: 4_900_000,
  booli_estimate_mid: 5_100_000,
  booli_estimate_high: 5_300_000,
  has_balcony: true,
  has_patio: false,
  has_elevator: true,
  has_fireplace: true,
  has_storage: true,
  showing_date: null,
};

const nullableListing: Listing = {
  id: 2,
  booli_id: 1002,
  listing_type: "bostad",
  url: "https://booli.se/1002",
  published_date: null,
  scraped_at: "2024-01-01T06:00:00Z",
  address: null,
  neighbourhood: null,
  municipality: null,
  postal_code: null,
  brf_name: null,
  living_area_m2: null,
  rooms: null,
  floor: null,
  total_floors: null,
  construction_year: null,
  list_price: null,
  price_per_m2: null,
  monthly_fee: null,
  operating_cost: null,
  booli_estimate_low: null,
  booli_estimate_mid: null,
  booli_estimate_high: null,
  has_balcony: false,
  has_patio: false,
  has_elevator: false,
  has_fireplace: false,
  has_storage: false,
  showing_date: null,
};

const ALL_RULES = [
  "area_value",
  "deal_quality",
  "fee_per_m2",
  "size_and_rooms",
  "floor_and_elevator",
  "balcony_or_patio",
  "construction_era",
  "booli_estimate_confidence",
  "fireplace",
  "storage",
];

describe("scoreListing – range", () => {
  test("fully-populated listing produces total_score in [0, 100]", () => {
    const { total_score } = scoreListing(fullListing);
    expect(total_score).toBeGreaterThanOrEqual(0);
    expect(total_score).toBeLessThanOrEqual(100);
  });

  test("total_score is an integer", () => {
    const { total_score } = scoreListing(fullListing);
    expect(Number.isInteger(total_score)).toBe(true);
  });

  test("all-null listing scores 0 without throwing", () => {
    const { total_score } = scoreListing(nullableListing);
    expect(total_score).toBe(0);
  });
});

describe("scoreListing – rule_breakdown completeness", () => {
  test("rule_breakdown contains an entry for every rule on a full listing", () => {
    const { rule_breakdown } = scoreListing(fullListing);
    for (const rule of ALL_RULES) {
      expect(rule_breakdown).toHaveProperty(rule);
    }
  });

  test("rule_breakdown contains an entry for every rule on a null listing", () => {
    const { rule_breakdown } = scoreListing(nullableListing);
    for (const rule of ALL_RULES) {
      expect(rule_breakdown).toHaveProperty(rule);
    }
  });

  test("null-field rules contribute 0 in the breakdown", () => {
    const { rule_breakdown } = scoreListing(nullableListing);
    for (const rule of ALL_RULES) {
      expect(rule_breakdown[rule]).toBe(0);
    }
  });
});

describe("scoreListing – total equals sum of breakdown", () => {
  test("total_score equals sum of all rule_breakdown values", () => {
    const { total_score, rule_breakdown } = scoreListing(fullListing);
    const sum = Object.values(rule_breakdown).reduce((acc, v) => acc + (v ?? 0), 0);
    expect(total_score).toBe(sum);
  });
});
