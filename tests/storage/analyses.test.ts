import { describe, expect, test, beforeEach } from "bun:test";
import type { Database } from "bun:sqlite";
import { initDatabase } from "../../src/storage/db";
import { insertListing } from "../../src/storage/listings";
import { insertAnalysis, getAnalysisByListingId } from "../../src/storage/analyses";
import type { NewListing } from "../../src/storage/schemas";

const newListing = (): NewListing => ({
  booli_id: 123456,
  listing_type: "bostad",
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
  showing_date: null,
});

let db: Database;
let listingId: number;

beforeEach(() => {
  db = initDatabase(":memory:");
  listingId = insertListing(db, newListing())!;
});

describe("insertAnalysis", () => {
  test("inserts an analysis and returns its generated id", () => {
    const id = insertAnalysis(db, {
      listing_id: listingId,
      result: JSON.stringify({ brf: { verdict: "healthy" }, location: { verdict: "good" } }),
      analysed_at: "2026-04-13T06:02:00.000Z",
    });
    expect(id).toBeGreaterThan(0);
  });
});

describe("getAnalysisByListingId", () => {
  test("returns the analysis for a listing", () => {
    const result = JSON.stringify({ brf: { verdict: "healthy" }, location: { verdict: "average" } });
    insertAnalysis(db, {
      listing_id: listingId,
      result,
      analysed_at: "2026-04-13T06:02:00.000Z",
    });

    const analysis = getAnalysisByListingId(db, listingId);
    expect(analysis).not.toBeNull();
    expect(analysis!.result).toBe(result);
    expect(analysis!.listing_id).toBe(listingId);
  });

  test("returns null when no analysis exists for the listing", () => {
    const analysis = getAnalysisByListingId(db, 99999);
    expect(analysis).toBeNull();
  });

  test("result JSON is returned as a string and is parseable", () => {
    const result = JSON.stringify({ verdict: "positive", score: 95 });
    insertAnalysis(db, { listing_id: listingId, result, analysed_at: "2026-04-13T06:02:00.000Z" });

    const analysis = getAnalysisByListingId(db, listingId)!;
    expect(() => JSON.parse(analysis.result)).not.toThrow();
    expect(JSON.parse(analysis.result).verdict).toBe("positive");
  });
});
