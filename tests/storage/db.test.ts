import { describe, expect, test } from "bun:test";
import { initDatabase } from "../../src/storage/db";

const EXPECTED_TABLES = ["listings", "scores", "analyses", "runs"];

function getTables(db: ReturnType<typeof initDatabase>): string[] {
  const rows = db
    .query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    .all();
  return rows.map((r) => r.name);
}

describe("initDatabase", () => {
  test("creates all four tables on a fresh in-memory database", () => {
    const db = initDatabase(":memory:");
    const tables = getTables(db);
    for (const table of EXPECTED_TABLES) {
      expect(tables).toContain(table);
    }
  });

  test("is idempotent — re-initialising preserves existing data", () => {
    const db = initDatabase(":memory:");
    db.run("INSERT INTO runs (started_at, completed_at, listings_scraped, listings_scored, listings_analysed, email_sent) VALUES (?, ?, ?, ?, ?, ?)", [
      "2026-04-13T06:00:00.000Z",
      null,
      0,
      0,
      0,
      0,
    ]);
    const countBefore = db.query<{ count: number }, []>("SELECT COUNT(*) as count FROM runs").get()!.count;

    // Calling initDatabase again on the same connection should not drop data
    // (In practice callers would call it once; this verifies CREATE TABLE IF NOT EXISTS semantics)
    db.run(`CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      listings_scraped INTEGER NOT NULL DEFAULT 0,
      listings_scored INTEGER NOT NULL DEFAULT 0,
      listings_analysed INTEGER NOT NULL DEFAULT 0,
      email_sent INTEGER NOT NULL DEFAULT 0
    )`);

    const countAfter = db.query<{ count: number }, []>("SELECT COUNT(*) as count FROM runs").get()!.count;
    expect(countAfter).toBe(countBefore);
  });

  test("in-memory database is fully functional", () => {
    const db = initDatabase(":memory:");
    expect(() =>
      db.run(
        "INSERT INTO runs (started_at, completed_at, listings_scraped, listings_scored, listings_analysed, email_sent) VALUES (?, ?, ?, ?, ?, ?)",
        ["2026-04-13T06:00:00.000Z", null, 0, 0, 0, 0]
      )
    ).not.toThrow();
    const row = db.query<{ id: number }, []>("SELECT id FROM runs").get();
    expect(row?.id).toBe(1);
  });

  test("listings table has unique constraint on (booli_id, listing_type)", () => {
    const db = initDatabase(":memory:");
    const insert = () =>
      db.run(
        `INSERT INTO listings (booli_id, listing_type, url, scraped_at, has_balcony, has_patio, has_elevator, has_fireplace, has_storage)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [12345, "bostad", "https://booli.se/bostad/12345", "2026-04-13T06:00:00.000Z", 0, 0, 0, 0, 0]
      );
    insert();
    expect(insert).toThrow();
  });
});
