import { test, expect, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { existsSync, unlinkSync, writeFileSync } from "node:fs";
import {
  getLastRun,
  getListings,
  getListingById,
  getDbInfo,
} from "../../viewer/db";

let db: Database;

function seedSchema(db: Database) {
  db.run(`CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    listings_scraped INTEGER NOT NULL DEFAULT 0,
    listings_scored INTEGER NOT NULL DEFAULT 0,
    listings_analysed INTEGER NOT NULL DEFAULT 0,
    email_sent INTEGER NOT NULL DEFAULT 0
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booli_id INTEGER NOT NULL,
    listing_type TEXT NOT NULL,
    url TEXT NOT NULL,
    published_date TEXT,
    scraped_at TEXT NOT NULL,
    address TEXT,
    neighbourhood TEXT,
    municipality TEXT,
    postal_code TEXT,
    brf_name TEXT,
    living_area_m2 REAL,
    rooms REAL,
    floor INTEGER,
    total_floors INTEGER,
    construction_year INTEGER,
    list_price INTEGER,
    price_per_m2 INTEGER,
    monthly_fee INTEGER,
    operating_cost INTEGER,
    booli_estimate_low INTEGER,
    booli_estimate_mid INTEGER,
    booli_estimate_high INTEGER,
    has_balcony INTEGER NOT NULL DEFAULT 0,
    has_patio INTEGER NOT NULL DEFAULT 0,
    has_elevator INTEGER NOT NULL DEFAULT 0,
    has_fireplace INTEGER NOT NULL DEFAULT 0,
    has_storage INTEGER NOT NULL DEFAULT 0,
    showing_date TEXT,
    UNIQUE (booli_id, listing_type)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    listing_id INTEGER NOT NULL REFERENCES listings(id),
    total_score INTEGER NOT NULL,
    rule_breakdown TEXT NOT NULL,
    scored_at TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    listing_id INTEGER NOT NULL REFERENCES listings(id),
    result TEXT NOT NULL,
    analysed_at TEXT NOT NULL
  )`);
}

function insertListing(db: Database, overrides: Record<string, unknown> = {}) {
  const defaults = {
    booli_id: 1,
    listing_type: "bostad",
    url: "https://booli.se/1",
    scraped_at: "2026-04-24T06:00:00Z",
    address: "Storgatan 1",
    neighbourhood: "Östermalm",
    rooms: 3,
    living_area_m2: 75.0,
    list_price: 4000000,
    monthly_fee: 4000,
    has_balcony: 0,
    has_patio: 0,
    has_elevator: 0,
    has_fireplace: 0,
    has_storage: 0,
  };
  const data = { ...defaults, ...overrides };
  const result = db.run(
    `INSERT INTO listings (booli_id, listing_type, url, scraped_at, address, neighbourhood,
      rooms, living_area_m2, list_price, monthly_fee,
      has_balcony, has_patio, has_elevator, has_fireplace, has_storage)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.booli_id, data.listing_type, data.url, data.scraped_at,
      data.address, data.neighbourhood, data.rooms, data.living_area_m2,
      data.list_price, data.monthly_fee,
      data.has_balcony, data.has_patio, data.has_elevator, data.has_fireplace, data.has_storage,
    ]
  );
  return Number(result.lastInsertRowid);
}

beforeEach(() => {
  db = new Database(":memory:");
  seedSchema(db);
});

afterEach(() => {
  db.close();
});

// --- GET /api/last-run ---

test("getLastRun: returns most recent run", () => {
  db.run(`INSERT INTO runs (started_at, completed_at, listings_scraped, listings_scored, listings_analysed) VALUES (?, ?, ?, ?, ?)`,
    ["2026-04-23T06:00:00Z", "2026-04-23T06:03:00Z", 40, 38, 5]);
  db.run(`INSERT INTO runs (started_at, completed_at, listings_scraped, listings_scored, listings_analysed) VALUES (?, ?, ?, ?, ?)`,
    ["2026-04-24T06:00:00Z", "2026-04-24T06:02:00Z", 42, 40, 3]);

  const run = getLastRun(db);
  expect(run).not.toBeNull();
  expect(run!.started_at).toBe("2026-04-24T06:00:00Z");
  expect(run!.listings_scraped).toBe(42);
});

test("getLastRun: returns null when runs table is empty", () => {
  expect(getLastRun(db)).toBeNull();
});

// --- GET /api/listings ---

test("getListings: returns listings joined with scores ordered by total_score DESC", () => {
  const id1 = insertListing(db, { booli_id: 1 });
  const id2 = insertListing(db, { booli_id: 2, url: "https://booli.se/2" });
  db.run(`INSERT INTO scores (listing_id, total_score, rule_breakdown, scored_at) VALUES (?, ?, ?, ?)`,
    [id1, 60, "{}", "2026-04-24T06:00:00Z"]);
  db.run(`INSERT INTO scores (listing_id, total_score, rule_breakdown, scored_at) VALUES (?, ?, ?, ?)`,
    [id2, 85, "{}", "2026-04-24T06:00:00Z"]);

  const listings = getListings(db);
  expect(listings).toHaveLength(2);
  expect(listings[0].total_score).toBe(85);
  expect(listings[1].total_score).toBe(60);
});

test("getListings: returns empty array when no listings", () => {
  expect(getListings(db)).toEqual([]);
});

// --- GET /api/listings/:id ---

test("getListingById: returns listing with parsed rule_breakdown and analysis", () => {
  const id = insertListing(db);
  const breakdown = { area_value: 18, deal_quality: 15 };
  db.run(`INSERT INTO scores (listing_id, total_score, rule_breakdown, scored_at) VALUES (?, ?, ?, ?)`,
    [id, 75, JSON.stringify(breakdown), "2026-04-24T06:00:00Z"]);
  db.run(`INSERT INTO analyses (listing_id, result, analysed_at) VALUES (?, ?, ?)`,
    [id, "Great apartment!", "2026-04-24T06:01:00Z"]);

  const detail = getListingById(db, id);
  expect(detail).not.toBeNull();
  expect(detail!.total_score).toBe(75);
  expect(detail!.rule_breakdown).toEqual(breakdown);
  expect(detail!.analysis).toBe("Great apartment!");
});

test("getListingById: returns null for unknown id", () => {
  expect(getListingById(db, 9999)).toBeNull();
});

test("getListingById: returns listing with null analysis when none exists", () => {
  const id = insertListing(db);
  db.run(`INSERT INTO scores (listing_id, total_score, rule_breakdown, scored_at) VALUES (?, ?, ?, ?)`,
    [id, 50, "{}", "2026-04-24T06:00:00Z"]);

  const detail = getListingById(db, id);
  expect(detail).not.toBeNull();
  expect(detail!.analysis).toBeNull();
});

// --- POST /api/refresh (tested via forceRefresh in r2.test.ts) ---

// --- GET /api/db-info ---

test("getDbInfo: returns last-modified timestamp of local DB file", () => {
  const tmpFile = join(tmpdir(), `db-info-test-${Date.now()}.db`);
  writeFileSync(tmpFile, "data");
  const info = getDbInfo(tmpFile);
  expect(info.lastModified).not.toBeNull();
  expect(new Date(info.lastModified!).getTime()).toBeGreaterThan(0);
  unlinkSync(tmpFile);
});

test("getDbInfo: returns null lastModified when file does not exist", () => {
  const info = getDbInfo("/nonexistent/path/listings.db");
  expect(info.lastModified).toBeNull();
});
