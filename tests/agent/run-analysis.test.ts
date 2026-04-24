import { test, expect, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { runAnalysis } from "../../src/agent/index";
import type { AnalysisConfig } from "../../src/config/search-config";

const CONFIG: AnalysisConfig = { scoreThreshold: 70, maxSteps: 5 };

let db: Database;

function seedSchema(db: Database) {
  db.run(`CREATE TABLE listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT, booli_id INTEGER, listing_type TEXT,
    url TEXT, scraped_at TEXT, address TEXT, neighbourhood TEXT, rooms REAL,
    floor INTEGER, living_area_m2 REAL, list_price INTEGER, monthly_fee INTEGER,
    brf_name TEXT, has_balcony INTEGER DEFAULT 0, has_patio INTEGER DEFAULT 0,
    has_elevator INTEGER DEFAULT 0, has_fireplace INTEGER DEFAULT 0, has_storage INTEGER DEFAULT 0
  )`);
  db.run(`CREATE TABLE scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT, listing_id INTEGER, total_score INTEGER,
    rule_breakdown TEXT, scored_at TEXT
  )`);
  db.run(`CREATE TABLE analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT, listing_id INTEGER,
    result TEXT, analysed_at TEXT
  )`);
}

function insertScoredListing(db: Database, score: number, url = "https://booli.se/1") {
  const res = db.run(
    `INSERT INTO listings (booli_id, listing_type, url, scraped_at, address, brf_name, has_balcony, has_patio, has_elevator, has_fireplace, has_storage)
     VALUES (1, 'bostad', ?, '2026-04-24T06:00:00Z', 'Storgatan 1', 'BRF Solsidan', 0, 0, 0, 0, 0)`,
    [url]
  );
  const id = Number(res.lastInsertRowid);
  db.run(`INSERT INTO scores (listing_id, total_score, rule_breakdown, scored_at) VALUES (?, ?, '{}', '2026-04-24T06:00:00Z')`, [id, score]);
  return id;
}

beforeEach(() => {
  db = new Database(":memory:");
  seedSchema(db);
});

afterEach(() => db.close());

test("runAnalysis: skips listings below scoreThreshold", async () => {
  insertScoredListing(db, 50);
  const called = { count: 0 };
  await runAnalysis(db, CONFIG, async () => { called.count++; return { text: '{"notifyUser":false,"explanation":"x"}' }; });
  expect(called.count).toBe(0);
  expect(db.query("SELECT * FROM analyses").all()).toHaveLength(0);
});

test("runAnalysis: skips listings already in analyses table", async () => {
  const id = insertScoredListing(db, 85);
  db.run(`INSERT INTO analyses (listing_id, result, analysed_at) VALUES (?, '{"notifyUser":false,"explanation":"prior"}', '2026-04-23T06:00:00Z')`, [id]);
  const called = { count: 0 };
  await runAnalysis(db, CONFIG, async () => { called.count++; return { text: '{"notifyUser":false,"explanation":"x"}' }; });
  expect(called.count).toBe(0);
  expect(db.query("SELECT * FROM analyses").all()).toHaveLength(1);
});

test("runAnalysis: analyses eligible listing and inserts result", async () => {
  const id = insertScoredListing(db, 85);
  const analysedIds = await runAnalysis(
    db,
    CONFIG,
    async () => ({ text: '{"notifyUser":true,"explanation":"Great BRF, strong finances."}' })
  );
  const rows = db.query<{ result: string; listing_id: number }, []>("SELECT * FROM analyses").all();
  expect(rows).toHaveLength(1);
  expect(rows[0].listing_id).toBe(id);
  const parsed = JSON.parse(rows[0].result);
  expect(parsed.notifyUser).toBe(true);
  expect(analysedIds).toContain(id);
});

test("runAnalysis: returns all analysed listing IDs regardless of notifyUser", async () => {
  insertScoredListing(db, 80, "https://booli.se/1");
  insertScoredListing(db, 90, "https://booli.se/2");
  let call = 0;
  const results = ['{"notifyUser":false,"explanation":"a"}', '{"notifyUser":true,"explanation":"b"}'];
  const ids = await runAnalysis(db, CONFIG, async () => ({ text: results[call++] }));
  expect(ids).toHaveLength(2);
});
