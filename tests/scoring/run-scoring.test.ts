import { test, expect, describe, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { initDatabase } from "../../src/storage/db";
import { insertListing } from "../../src/storage/listings";
import { runScoring } from "../../src/scoring/run-scoring";
import type { NewListing } from "../../src/storage/schemas";

const baseListing: NewListing = {
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

function countScores(db: Database): number {
  return (db.query("SELECT COUNT(*) as n FROM scores").get() as { n: number }).n;
}

function getScore(db: Database, listingId: number) {
  return db
    .query("SELECT * FROM scores WHERE listing_id = ?")
    .get(listingId) as { total_score: number; rule_breakdown: string } | null;
}

let db: Database;

beforeEach(() => {
  db = initDatabase(":memory:");
});

describe("runScoring – score insertion", () => {
  test("inserts a score row for an unscored listing", () => {
    const id = insertListing(db, baseListing)!;
    runScoring(db);
    expect(countScores(db)).toBe(1);
    const row = getScore(db, id);
    expect(row).not.toBeNull();
  });

  test("total_score is an integer between 0 and 100", () => {
    insertListing(db, baseListing);
    runScoring(db);
    const row = db.query("SELECT total_score FROM scores LIMIT 1").get() as { total_score: number };
    expect(row.total_score).toBeGreaterThanOrEqual(0);
    expect(row.total_score).toBeLessThanOrEqual(100);
    expect(Number.isInteger(row.total_score)).toBe(true);
  });

  test("rule_breakdown is stored as valid JSON with all rule keys", () => {
    insertListing(db, baseListing);
    runScoring(db);
    const row = db.query("SELECT rule_breakdown FROM scores LIMIT 1").get() as {
      rule_breakdown: string;
    };
    const breakdown = JSON.parse(row.rule_breakdown) as Record<string, number>;
    const expectedRules = [
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
    for (const rule of expectedRules) {
      expect(breakdown).toHaveProperty(rule);
    }
  });
});

describe("runScoring – already-scored listings are skipped", () => {
  test("does not insert a second score row for an already-scored listing", () => {
    const id = insertListing(db, baseListing)!;
    runScoring(db);
    runScoring(db);
    expect(countScores(db)).toBe(1);
    const row = getScore(db, id);
    expect(row).not.toBeNull();
  });
});

describe("runScoring – processes all unscored listings", () => {
  test("all N unscored listings receive a score row after the call", () => {
    for (let i = 0; i < 3; i++) {
      insertListing(db, { ...baseListing, booli_id: 2000 + i, url: `https://booli.se/${2000 + i}` });
    }
    runScoring(db);
    expect(countScores(db)).toBe(3);
  });

  test("no-op when all listings already have scores", () => {
    insertListing(db, baseListing);
    runScoring(db);
    const countBefore = countScores(db);
    runScoring(db);
    expect(countScores(db)).toBe(countBefore);
  });

  test("no-op when no listings exist", () => {
    runScoring(db);
    expect(countScores(db)).toBe(0);
  });
});
