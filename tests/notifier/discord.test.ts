import { test, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
import { Database } from "bun:sqlite";
import { runNotifier } from "../../src/notifier/discord";

let db: Database;
const originalEnv = process.env.DISCORD_WEBHOOK;

function seedSchema(db: Database) {
  db.run(`CREATE TABLE listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT, booli_id INTEGER, listing_type TEXT,
    url TEXT NOT NULL, scraped_at TEXT, address TEXT,
    has_balcony INTEGER DEFAULT 0, has_patio INTEGER DEFAULT 0,
    has_elevator INTEGER DEFAULT 0, has_fireplace INTEGER DEFAULT 0, has_storage INTEGER DEFAULT 0
  )`);
  db.run(`CREATE TABLE scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT, listing_id INTEGER, total_score INTEGER,
    rule_breakdown TEXT, scored_at TEXT
  )`);
  db.run(`CREATE TABLE analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT, listing_id INTEGER, result TEXT, analysed_at TEXT
  )`);
}

function insertListing(db: Database, id: number, address: string, url: string) {
  db.run(`INSERT INTO listings (id, booli_id, listing_type, url, scraped_at, address, has_balcony, has_patio, has_elevator, has_fireplace, has_storage) VALUES (?, 1, 'bostad', ?, '2026-04-24T06:00:00Z', ?, 0, 0, 0, 0, 0)`, [id, url, address]);
  db.run(`INSERT INTO scores (listing_id, total_score, rule_breakdown, scored_at) VALUES (?, 85, '{}', '2026-04-24T06:00:00Z')`, [id]);
}

function insertAnalysis(db: Database, listingId: number, notifyUser: boolean) {
  db.run(`INSERT INTO analyses (listing_id, result, analysed_at) VALUES (?, ?, '2026-04-24T06:01:00Z')`, [
    listingId,
    JSON.stringify({ notifyUser, explanation: "Test explanation." }),
  ]);
}

beforeEach(() => {
  db = new Database(":memory:");
  seedSchema(db);
  process.env.DISCORD_WEBHOOK = "https://discord.com/api/webhooks/test";
});

afterEach(() => {
  db.close();
  process.env.DISCORD_WEBHOOK = originalEnv;
});

test("runNotifier: sends one message per notifyUser listing", async () => {
  insertListing(db, 1, "Storgatan 1", "https://booli.se/1");
  insertListing(db, 2, "Lillgatan 2", "https://booli.se/2");
  insertAnalysis(db, 1, true);
  insertAnalysis(db, 2, true);

  const posts: string[] = [];
  spyOn(globalThis, "fetch").mockImplementation(async (url: RequestInfo) => {
    posts.push(String(url));
    return new Response(null, { status: 204 });
  });

  await runNotifier(db, [1, 2]);
  expect(posts).toHaveLength(2);
  expect(posts.every((u) => u === "https://discord.com/api/webhooks/test")).toBe(true);
});

test("runNotifier: skips listings where notifyUser is false", async () => {
  insertListing(db, 1, "Storgatan 1", "https://booli.se/1");
  insertListing(db, 2, "Lillgatan 2", "https://booli.se/2");
  insertAnalysis(db, 1, true);
  insertAnalysis(db, 2, false);

  const posts: string[] = [];
  spyOn(globalThis, "fetch").mockImplementation(async () => {
    posts.push("called");
    return new Response(null, { status: 204 });
  });

  await runNotifier(db, [1, 2]);
  expect(posts).toHaveLength(1);
});

test("runNotifier: handles missing DISCORD_WEBHOOK gracefully", async () => {
  delete process.env.DISCORD_WEBHOOK;
  insertListing(db, 1, "Storgatan 1", "https://booli.se/1");
  insertAnalysis(db, 1, true);

  let fetchCalled = false;
  spyOn(globalThis, "fetch").mockImplementation(async () => {
    fetchCalled = true;
    return new Response(null, { status: 204 });
  });

  await expect(runNotifier(db, [1])).resolves.toBeUndefined();
  expect(fetchCalled).toBe(false);
});
