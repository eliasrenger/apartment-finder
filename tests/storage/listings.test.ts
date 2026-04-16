import { describe, expect, test, beforeEach } from "bun:test";
import type { Database } from "bun:sqlite";
import { initDatabase } from "../../src/storage/db";
import { insertListing, getListingById, getListingsSince } from "../../src/storage/listings";
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
  showing_date: "2026-04-19T10:00:00.000Z",
});

let db: Database;

beforeEach(() => {
  db = initDatabase(":memory:");
});

describe("insertListing", () => {
  test("inserts a new listing and returns its generated id", () => {
    const id = insertListing(db, newListing());
    expect(id).toBeGreaterThan(0);
  });

  test("returns null for a duplicate (booli_id, listing_type) — no error thrown", () => {
    insertListing(db, newListing());
    const result = insertListing(db, newListing());
    expect(result).toBeNull();
  });

  test("allows same booli_id with different listing_type", () => {
    const id1 = insertListing(db, newListing());
    const id2 = insertListing(db, { ...newListing(), listing_type: "annons", url: "https://www.booli.se/annons/123456" });
    expect(id1).not.toBeNull();
    expect(id2).not.toBeNull();
    expect(id1).not.toBe(id2);
  });
});

describe("getListingById", () => {
  test("returns a listing by id", () => {
    const id = insertListing(db, newListing())!;
    const listing = getListingById(db, id);
    expect(listing).not.toBeNull();
    expect(listing!.booli_id).toBe(123456);
    expect(listing!.listing_type).toBe("bostad");
  });

  test("returns null for a non-existent id", () => {
    const listing = getListingById(db, 99999);
    expect(listing).toBeNull();
  });

  test("boolean fields are returned as booleans", () => {
    const id = insertListing(db, newListing())!;
    const listing = getListingById(db, id)!;
    expect(listing.has_balcony).toBe(true);
    expect(listing.has_patio).toBe(false);
    expect(listing.has_elevator).toBe(true);
  });

  test("nullable fields are returned as null when not provided", () => {
    const minimal: NewListing = {
      ...newListing(),
      floor: null,
      total_floors: null,
      showing_date: null,
      operating_cost: null,
    };
    const id = insertListing(db, minimal)!;
    const listing = getListingById(db, id)!;
    expect(listing.floor).toBeNull();
    expect(listing.showing_date).toBeNull();
  });
});

describe("getListingsSince", () => {
  test("returns listings scraped at or after the given timestamp", () => {
    insertListing(db, { ...newListing(), scraped_at: "2026-04-13T05:00:00.000Z" });
    insertListing(db, { ...newListing(), booli_id: 222222, url: "https://booli.se/bostad/222222", scraped_at: "2026-04-13T06:00:00.000Z" });
    insertListing(db, { ...newListing(), booli_id: 333333, url: "https://booli.se/bostad/333333", scraped_at: "2026-04-13T07:00:00.000Z" });

    const results = getListingsSince(db, "2026-04-13T06:00:00.000Z");
    expect(results).toHaveLength(2);
    expect(results.map((l) => l.booli_id).sort()).toEqual([222222, 333333]);
  });

  test("returns empty array when no listings match", () => {
    insertListing(db, { ...newListing(), scraped_at: "2026-04-12T06:00:00.000Z" });
    const results = getListingsSince(db, "2026-04-13T06:00:00.000Z");
    expect(results).toHaveLength(0);
  });
});
