import { describe, expect, test } from "bun:test";
import {
  ListingSchema,
  NewListingSchema,
  ScoreSchema,
  NewScoreSchema,
  AnalysisSchema,
  NewAnalysisSchema,
  RunSchema,
  NewRunSchema,
} from "../../src/storage/schemas";

const validListing = {
  id: 1,
  booli_id: 123456,
  listing_type: "bostad" as const,
  url: "https://www.booli.se/bostad/123456",
  published_date: "2026-04-13",
  scraped_at: "2026-04-13T06:00:00.000Z",
  address: "Storgatan 1",
  neighbourhood: "Södermalm",
  municipality: "Stockholm",
  postal_code: "11620",
  brf_name: "BRF Storgatan",
  living_area_m2: 55.0,
  rooms: 2.0,
  floor: 3,
  total_floors: 6,
  construction_year: 1965,
  list_price: 3500000,
  price_per_m2: 63636,
  monthly_fee: 3800,
  operating_cost: 500,
  booli_estimate_low: 3300000,
  booli_estimate_mid: 3600000,
  booli_estimate_high: 3900000,
  has_balcony: true,
  has_patio: false,
  has_elevator: true,
  has_fireplace: false,
  has_storage: true,
  showing_date: "2026-04-19T10:00:00.000Z",
};

const validNewListing = {
  booli_id: 123456,
  listing_type: "annons" as const,
  url: "https://www.booli.se/annons/123456",
  published_date: null,
  scraped_at: "2026-04-13T06:00:00.000Z",
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

describe("ListingSchema", () => {
  test("accepts a valid full listing row", () => {
    expect(() => ListingSchema.parse(validListing)).not.toThrow();
  });

  test("infers correct boolean types", () => {
    const parsed = ListingSchema.parse(validListing);
    expect(parsed.has_balcony).toBe(true);
    expect(parsed.has_elevator).toBe(true);
    expect(parsed.has_patio).toBe(false);
  });

  test("coerces SQLite integer booleans (1/0) to boolean", () => {
    const raw = { ...validListing, has_balcony: 1, has_patio: 0, has_elevator: 1 };
    const parsed = ListingSchema.parse(raw);
    expect(parsed.has_balcony).toBe(true);
    expect(parsed.has_patio).toBe(false);
  });

  test("accepts nullable optional fields as null", () => {
    const parsed = ListingSchema.parse({ ...validListing, floor: null, total_floors: null, showing_date: null });
    expect(parsed.floor).toBeNull();
    expect(parsed.showing_date).toBeNull();
  });

  test("rejects invalid listing_type", () => {
    expect(() => ListingSchema.parse({ ...validListing, listing_type: "house" })).toThrow();
  });

  test("rejects missing required fields", () => {
    const { booli_id: _, ...withoutBooliId } = validListing;
    expect(() => ListingSchema.parse(withoutBooliId)).toThrow();
  });
});

describe("NewListingSchema", () => {
  test("accepts a valid new listing without id", () => {
    expect(() => NewListingSchema.parse(validNewListing)).not.toThrow();
  });

  test("rejects a row that includes id", () => {
    expect(() => NewListingSchema.parse({ ...validNewListing, id: 1 })).toThrow();
  });
});

describe("ScoreSchema", () => {
  const validScore = {
    id: 1,
    listing_id: 1,
    total_score: 75,
    rule_breakdown: JSON.stringify({ balcony: 10, elevator: 10, floor: 15 }),
    scored_at: "2026-04-13T06:01:00.000Z",
  };

  test("accepts a valid score row", () => {
    expect(() => ScoreSchema.parse(validScore)).not.toThrow();
  });

  test("rejects missing listing_id", () => {
    const { listing_id: _, ...without } = validScore;
    expect(() => ScoreSchema.parse(without)).toThrow();
  });
});

describe("NewScoreSchema", () => {
  test("accepts a valid new score without id", () => {
    const validNewScore = {
      listing_id: 1,
      total_score: 75,
      rule_breakdown: JSON.stringify({ balcony: 10 }),
      scored_at: "2026-04-13T06:01:00.000Z",
    };
    expect(() => NewScoreSchema.parse(validNewScore)).not.toThrow();
  });
});

describe("AnalysisSchema", () => {
  const validAnalysis = {
    id: 1,
    listing_id: 1,
    result: JSON.stringify({ brf: "good", location: "average" }),
    analysed_at: "2026-04-13T06:02:00.000Z",
  };

  test("accepts a valid analysis row", () => {
    expect(() => AnalysisSchema.parse(validAnalysis)).not.toThrow();
  });

  test("rejects missing result", () => {
    const { result: _, ...without } = validAnalysis;
    expect(() => AnalysisSchema.parse(without)).toThrow();
  });
});

describe("NewAnalysisSchema", () => {
  test("accepts a valid new analysis without id", () => {
    const valid = {
      listing_id: 1,
      result: JSON.stringify({ verdict: "positive" }),
      analysed_at: "2026-04-13T06:02:00.000Z",
    };
    expect(() => NewAnalysisSchema.parse(valid)).not.toThrow();
  });
});

describe("RunSchema", () => {
  test("accepts a complete run row", () => {
    const valid = {
      id: 1,
      started_at: "2026-04-13T06:00:00.000Z",
      completed_at: "2026-04-13T06:05:00.000Z",
      listings_scraped: 42,
      listings_scored: 10,
      listings_analysed: 3,
      email_sent: true,
    };
    expect(() => RunSchema.parse(valid)).not.toThrow();
  });

  test("accepts null completed_at for in-progress run", () => {
    const valid = {
      id: 1,
      started_at: "2026-04-13T06:00:00.000Z",
      completed_at: null,
      listings_scraped: 0,
      listings_scored: 0,
      listings_analysed: 0,
      email_sent: false,
    };
    const parsed = RunSchema.parse(valid);
    expect(parsed.completed_at).toBeNull();
  });

  test("coerces SQLite integer boolean for email_sent", () => {
    const raw = {
      id: 1,
      started_at: "2026-04-13T06:00:00.000Z",
      completed_at: null,
      listings_scraped: 0,
      listings_scored: 0,
      listings_analysed: 0,
      email_sent: 1,
    };
    const parsed = RunSchema.parse(raw);
    expect(parsed.email_sent).toBe(true);
  });
});

describe("NewRunSchema", () => {
  test("accepts a valid new run without id", () => {
    const valid = {
      started_at: "2026-04-13T06:00:00.000Z",
      completed_at: null,
      listings_scraped: 0,
      listings_scored: 0,
      listings_analysed: 0,
      email_sent: false,
    };
    expect(() => NewRunSchema.parse(valid)).not.toThrow();
  });
});
