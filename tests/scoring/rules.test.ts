import { test, expect, describe } from "bun:test";
import {
  areaValueRule,
  dealQualityRule,
  feePerM2Rule,
  sizeAndRoomsRule,
  floorAndElevatorRule,
  balconyOrPatioRule,
  constructionEraRule,
  booliEstimateConfidenceRule,
  firepaceRule,
  storageRule,
} from "../../src/scoring/rules";
import type { Listing } from "../../src/storage/schemas";

// Minimal base listing – override per test
const base: Listing = {
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
  living_area_m2: 60,
  rooms: 3,
  floor: 3,
  total_floors: 6,
  construction_year: 1925,
  list_price: 5_000_000,
  price_per_m2: 83_333,
  monthly_fee: 3_500,
  operating_cost: null,
  booli_estimate_low: 4_700_000,
  booli_estimate_mid: 5_100_000,
  booli_estimate_high: 5_300_000,
  has_balcony: true,
  has_patio: false,
  has_elevator: true,
  has_fireplace: true,
  has_storage: true,
  showing_date: null,
};

// ─── area_value ──────────────────────────────────────────────────────────────

describe("areaValueRule", () => {
  test("Tier 1 district scores maximum 20 points", () => {
    expect(areaValueRule({ ...base, neighbourhood: "Vasastan" })).toBe(20);
  });

  test("Östermalm also scores 20 points", () => {
    expect(areaValueRule({ ...base, neighbourhood: "Östermalm" })).toBe(20);
  });

  test("Södermalm also scores 20 points", () => {
    expect(areaValueRule({ ...base, neighbourhood: "Södermalm" })).toBe(20);
  });

  test("Tier 5 district scores 0", () => {
    expect(
      areaValueRule({ ...base, neighbourhood: "Rinkeby", postal_code: null, municipality: null })
    ).toBe(0);
  });

  test("Unknown area with null fallbacks scores 0", () => {
    expect(
      areaValueRule({ ...base, neighbourhood: null, postal_code: null, municipality: null })
    ).toBe(0);
  });

  test("Mid-tier district scores between 5 and 15", () => {
    const pts = areaValueRule({ ...base, neighbourhood: "Bromma" });
    expect(pts).toBeGreaterThanOrEqual(5);
    expect(pts).toBeLessThanOrEqual(15);
  });
});

// ─── deal_quality ─────────────────────────────────────────────────────────────

describe("dealQualityRule", () => {
  test("returns 0 when both area price and Booli estimate are null", () => {
    const pts = dealQualityRule({
      ...base,
      neighbourhood: null,
      postal_code: null,
      municipality: null,
      booli_estimate_mid: null,
    });
    expect(pts).toBe(0);
  });

  test("scores high when list_price is well below area average", () => {
    // Vasastan avg ~115,000 SEK/m². list price = 2,000,000 on 60m² = ~33k/m² (very cheap)
    const pts = dealQualityRule({
      ...base,
      neighbourhood: "Vasastan",
      list_price: 2_000_000,
      living_area_m2: 60,
      booli_estimate_mid: null,
    });
    expect(pts).toBeGreaterThan(5);
  });

  test("scores 0 on area component when list_price is 15%+ above area average", () => {
    // Vasastan avg ~115,000 SEK/m². 60m² at 9,000,000 = 150,000/m² (30% above avg)
    const pts = dealQualityRule({
      ...base,
      neighbourhood: "Vasastan",
      list_price: 9_000_000,
      living_area_m2: 60,
      booli_estimate_mid: null,
    });
    expect(pts).toBe(0);
  });

  test("scores positively when list_price is below Booli estimate", () => {
    const pts = dealQualityRule({
      ...base,
      neighbourhood: null,
      postal_code: null,
      municipality: null,
      list_price: 4_500_000,
      booli_estimate_mid: 5_100_000,
    });
    expect(pts).toBeGreaterThan(0);
  });

  test("null list_price returns 0", () => {
    expect(dealQualityRule({ ...base, list_price: null })).toBe(0);
  });

  test("null living_area_m2 returns 0", () => {
    expect(dealQualityRule({ ...base, living_area_m2: null })).toBe(0);
  });
});

// ─── fee_per_m2 ───────────────────────────────────────────────────────────────

describe("feePerM2Rule", () => {
  test("low fee (≤42 SEK/m²/month) scores maximum 15", () => {
    // 42 SEK/m²/month * 60 m² = 2520/month
    expect(feePerM2Rule({ ...base, monthly_fee: 2_500, living_area_m2: 60 })).toBe(15);
  });

  test("very high fee (≥100 SEK/m²/month) scores 0", () => {
    // 100 SEK/m²/month * 60 = 6000/month
    expect(feePerM2Rule({ ...base, monthly_fee: 6_100, living_area_m2: 60 })).toBe(0);
  });

  test("mid-range fee scores between 0 and 15", () => {
    // ~70 SEK/m²/month
    const pts = feePerM2Rule({ ...base, monthly_fee: 4_200, living_area_m2: 60 });
    expect(pts).toBeGreaterThan(0);
    expect(pts).toBeLessThan(15);
  });

  test("null monthly_fee returns 0", () => {
    expect(feePerM2Rule({ ...base, monthly_fee: null })).toBe(0);
  });

  test("null living_area_m2 returns 0", () => {
    expect(feePerM2Rule({ ...base, living_area_m2: null })).toBe(0);
  });
});

// ─── size_and_rooms ──────────────────────────────────────────────────────────

describe("sizeAndRoomsRule", () => {
  test("sweet-spot size (50–80m²) with 3 rooms scores maximum 12", () => {
    expect(sizeAndRoomsRule({ ...base, living_area_m2: 65, rooms: 3 })).toBe(12);
  });

  test("very small apartment scores less than maximum", () => {
    const pts = sizeAndRoomsRule({ ...base, living_area_m2: 22, rooms: 1 });
    expect(pts).toBeLessThan(12);
  });

  test("large apartment scores less than maximum", () => {
    const pts = sizeAndRoomsRule({ ...base, living_area_m2: 130, rooms: 5 });
    expect(pts).toBeLessThan(12);
  });

  test("null living_area_m2 returns 0", () => {
    expect(sizeAndRoomsRule({ ...base, living_area_m2: null })).toBe(0);
  });

  test("null rooms still scores if area is populated", () => {
    const pts = sizeAndRoomsRule({ ...base, rooms: null });
    expect(pts).toBeGreaterThanOrEqual(0);
    expect(pts).toBeLessThanOrEqual(12);
  });
});

// ─── floor_and_elevator ──────────────────────────────────────────────────────

describe("floorAndElevatorRule", () => {
  test("high floor (≥4) with elevator scores maximum 9", () => {
    expect(floorAndElevatorRule({ ...base, floor: 5, has_elevator: true })).toBe(9);
  });

  test("high floor (≥4) without elevator scores 0", () => {
    expect(floorAndElevatorRule({ ...base, floor: 5, has_elevator: false })).toBe(0);
  });

  test("ground floor (1) scores 2 or fewer", () => {
    const pts = floorAndElevatorRule({ ...base, floor: 1 });
    expect(pts).toBeLessThanOrEqual(2);
  });

  test("mid floor (2–3) scores mid-range (>2 and <9)", () => {
    const pts2 = floorAndElevatorRule({ ...base, floor: 2, has_elevator: false });
    const pts3 = floorAndElevatorRule({ ...base, floor: 3, has_elevator: false });
    expect(pts2).toBeGreaterThan(2);
    expect(pts2).toBeLessThan(9);
    expect(pts3).toBeGreaterThan(2);
    expect(pts3).toBeLessThan(9);
  });

  test("null floor returns 0", () => {
    expect(floorAndElevatorRule({ ...base, floor: null })).toBe(0);
  });
});

// ─── balcony_or_patio ─────────────────────────────────────────────────────────

describe("balconyOrPatioRule", () => {
  test("balcony scores maximum 9", () => {
    expect(balconyOrPatioRule({ ...base, has_balcony: true, has_patio: false })).toBe(9);
  });

  test("patio scores less than balcony but >0", () => {
    const pts = balconyOrPatioRule({ ...base, has_balcony: false, has_patio: true });
    expect(pts).toBeGreaterThan(0);
    expect(pts).toBeLessThan(9);
  });

  test("both balcony and patio scores maximum", () => {
    expect(balconyOrPatioRule({ ...base, has_balcony: true, has_patio: true })).toBe(9);
  });

  test("neither balcony nor patio scores 0", () => {
    expect(balconyOrPatioRule({ ...base, has_balcony: false, has_patio: false })).toBe(0);
  });
});

// ─── construction_era ─────────────────────────────────────────────────────────

describe("constructionEraRule", () => {
  test("pre-1930 scores maximum 7", () => {
    expect(constructionEraRule({ ...base, construction_year: 1925 })).toBe(7);
  });

  test("1960–1979 scores 2 or fewer", () => {
    expect(constructionEraRule({ ...base, construction_year: 1970 })).toBeLessThanOrEqual(2);
  });

  test("post-1999 scores 6 or more", () => {
    expect(constructionEraRule({ ...base, construction_year: 2010 })).toBeGreaterThanOrEqual(6);
  });

  test("1930–1959 scores between 3 and 6", () => {
    const pts = constructionEraRule({ ...base, construction_year: 1945 });
    expect(pts).toBeGreaterThanOrEqual(3);
    expect(pts).toBeLessThanOrEqual(6);
  });

  test("null construction_year returns 0", () => {
    expect(constructionEraRule({ ...base, construction_year: null })).toBe(0);
  });
});

// ─── booli_estimate_confidence ───────────────────────────────────────────────

describe("booliEstimateConfidenceRule", () => {
  test("narrow estimate range scores close to maximum 5", () => {
    // Range = (5200 - 4900) / 5000 = 6% spread — narrow
    const pts = booliEstimateConfidenceRule({
      ...base,
      booli_estimate_low: 4_900_000,
      booli_estimate_mid: 5_000_000,
      booli_estimate_high: 5_200_000,
    });
    expect(pts).toBeGreaterThanOrEqual(3);
  });

  test("very wide estimate range scores low", () => {
    // Range = (7000 - 3000) / 5000 = 80% spread — very uncertain
    const pts = booliEstimateConfidenceRule({
      ...base,
      booli_estimate_low: 3_000_000,
      booli_estimate_mid: 5_000_000,
      booli_estimate_high: 7_000_000,
    });
    expect(pts).toBeLessThan(3);
  });

  test("null estimate mid returns 0", () => {
    expect(
      booliEstimateConfidenceRule({
        ...base,
        booli_estimate_mid: null,
        booli_estimate_low: null,
        booli_estimate_high: null,
      })
    ).toBe(0);
  });
});

// ─── fireplace ────────────────────────────────────────────────────────────────

describe("firepaceRule", () => {
  test("has fireplace scores 3", () => {
    expect(firepaceRule({ ...base, has_fireplace: true })).toBe(3);
  });

  test("no fireplace scores 0", () => {
    expect(firepaceRule({ ...base, has_fireplace: false })).toBe(0);
  });
});

// ─── storage ─────────────────────────────────────────────────────────────────

describe("storageRule", () => {
  test("has storage scores 2", () => {
    expect(storageRule({ ...base, has_storage: true })).toBe(2);
  });

  test("no storage scores 0", () => {
    expect(storageRule({ ...base, has_storage: false })).toBe(0);
  });
});
