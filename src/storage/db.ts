import { Database } from "bun:sqlite";

export function initDatabase(path: string): Database {
  const db = new Database(path);
  db.run("PRAGMA journal_mode = WAL");
  db.run("PRAGMA foreign_keys = ON");

  db.run(`
    CREATE TABLE IF NOT EXISTS listings (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      booli_id            INTEGER NOT NULL,
      listing_type        TEXT    NOT NULL CHECK (listing_type IN ('bostad', 'annons')),
      url                 TEXT    NOT NULL,
      published_date      TEXT,
      scraped_at          TEXT    NOT NULL,
      address             TEXT,
      neighbourhood       TEXT,
      municipality        TEXT,
      postal_code         TEXT,
      brf_name            TEXT,
      living_area_m2      REAL,
      rooms               REAL,
      floor               INTEGER,
      total_floors        INTEGER,
      construction_year   INTEGER,
      list_price          INTEGER,
      price_per_m2        INTEGER,
      monthly_fee         INTEGER,
      operating_cost      INTEGER,
      booli_estimate_low  INTEGER,
      booli_estimate_mid  INTEGER,
      booli_estimate_high INTEGER,
      has_balcony         INTEGER NOT NULL DEFAULT 0,
      has_patio           INTEGER NOT NULL DEFAULT 0,
      has_elevator        INTEGER NOT NULL DEFAULT 0,
      has_fireplace       INTEGER NOT NULL DEFAULT 0,
      has_storage         INTEGER NOT NULL DEFAULT 0,
      showing_date        TEXT,
      UNIQUE (booli_id, listing_type)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS scores (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      listing_id     INTEGER NOT NULL REFERENCES listings(id),
      total_score    INTEGER NOT NULL,
      rule_breakdown TEXT    NOT NULL,
      scored_at      TEXT    NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS analyses (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      listing_id  INTEGER NOT NULL REFERENCES listings(id),
      result      TEXT    NOT NULL,
      analysed_at TEXT    NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS runs (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at         TEXT    NOT NULL,
      completed_at       TEXT,
      listings_scraped   INTEGER NOT NULL DEFAULT 0,
      listings_scored    INTEGER NOT NULL DEFAULT 0,
      listings_analysed  INTEGER NOT NULL DEFAULT 0,
      email_sent         INTEGER NOT NULL DEFAULT 0
    )
  `);

  return db;
}
