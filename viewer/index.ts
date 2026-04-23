import { Database } from "bun:sqlite";
import { existsSync } from "node:fs";
import { DB_PATH, fetchDbIfMissing, forceRefresh } from "./r2";
import { getLastRun, getListings, getListingById, getDbInfo } from "./db";
import index from "./index.html";

await fetchDbIfMissing();

function openDb(): Database {
  if (existsSync(DB_PATH)) return new Database(DB_PATH, { readonly: true });
  const mem = new Database(":memory:");
  mem.run("CREATE TABLE runs (id INTEGER PRIMARY KEY, started_at TEXT, completed_at TEXT, listings_scraped INTEGER DEFAULT 0, listings_scored INTEGER DEFAULT 0, listings_analysed INTEGER DEFAULT 0)");
  mem.run("CREATE TABLE listings (id INTEGER PRIMARY KEY, booli_id INTEGER, listing_type TEXT, url TEXT, scraped_at TEXT, address TEXT, neighbourhood TEXT, rooms REAL, living_area_m2 REAL, list_price INTEGER, monthly_fee INTEGER, has_balcony INTEGER DEFAULT 0, has_patio INTEGER DEFAULT 0, has_elevator INTEGER DEFAULT 0, has_fireplace INTEGER DEFAULT 0, has_storage INTEGER DEFAULT 0)");
  mem.run("CREATE TABLE scores (id INTEGER PRIMARY KEY, listing_id INTEGER, total_score INTEGER, rule_breakdown TEXT, scored_at TEXT)");
  mem.run("CREATE TABLE analyses (id INTEGER PRIMARY KEY, listing_id INTEGER, result TEXT, analysed_at TEXT)");
  return mem;
}

let db = openDb();

function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

Bun.serve({
  port: 3000,
  routes: {
    "/": index,
    "/api/last-run": {
      GET: () => json(getLastRun(db)),
    },
    "/api/listings": {
      GET: () => json(getListings(db)),
    },
    "/api/listings/:id": {
      GET: (req) => {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return json({ error: "Invalid id" }, 400);
        const listing = getListingById(db, id);
        if (!listing) return json({ error: "Not found" }, 404);
        return json(listing);
      },
    },
    "/api/refresh": {
      POST: async () => {
        await forceRefresh();
        db.close();
        db = openDb();
        return json({ ok: true, fetchedAt: new Date().toISOString() });
      },
    },
    "/api/db-info": {
      GET: () => json(getDbInfo(DB_PATH)),
    },
  },
});

console.log("Viewer running at http://localhost:3000");
