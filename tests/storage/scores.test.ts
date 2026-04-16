import { describe, expect, test, beforeEach } from "bun:test";
import type { Database } from "bun:sqlite";
import { initDatabase } from "../../src/storage/db";
import { insertListing } from "../../src/storage/listings";
import { insertScore, getScoreByListingId } from "../../src/storage/scores";
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

describe("insertScore", () => {
  test("inserts a score and returns its generated id", () => {
    const id = insertScore(db, {
      listing_id: listingId,
      total_score: 75,
      rule_breakdown: JSON.stringify({ balcony: 10, elevator: 10, floor: 15, price_per_m2: 30, monthly_fee: 10 }),
      scored_at: "2026-04-13T06:01:00.000Z",
    });
    expect(id).toBeGreaterThan(0);
  });
});

describe("getScoreByListingId", () => {
  test("returns the score for a listing", () => {
    const breakdown = JSON.stringify({ balcony: 10, elevator: 10 });
    insertScore(db, {
      listing_id: listingId,
      total_score: 20,
      rule_breakdown: breakdown,
      scored_at: "2026-04-13T06:01:00.000Z",
    });

    const score = getScoreByListingId(db, listingId);
    expect(score).not.toBeNull();
    expect(score!.total_score).toBe(20);
    expect(score!.rule_breakdown).toBe(breakdown);
    expect(score!.listing_id).toBe(listingId);
  });

  test("returns the most recent score when multiple exist", () => {
    insertScore(db, {
      listing_id: listingId,
      total_score: 20,
      rule_breakdown: "{}",
      scored_at: "2026-04-13T06:01:00.000Z",
    });
    insertScore(db, {
      listing_id: listingId,
      total_score: 80,
      rule_breakdown: "{}",
      scored_at: "2026-04-13T06:02:00.000Z",
    });

    const score = getScoreByListingId(db, listingId);
    expect(score!.total_score).toBe(80);
  });

  test("returns null for a listing with no score", () => {
    const score = getScoreByListingId(db, 99999);
    expect(score).toBeNull();
  });
});
