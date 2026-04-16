import { describe, test, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import type { NewListing } from "../../src/storage/schemas";
import { initDatabase } from "../../src/storage/db";
import { runPhase2 } from "../../src/scraper/run-phase2";

function makeNewListing(booliId: number, listingType: "bostad" | "annons"): NewListing {
  return {
    booli_id: booliId,
    listing_type: listingType,
    url: `https://www.booli.se/${listingType}/${booliId}`,
    address: null, neighbourhood: null, municipality: null, postal_code: null, brf_name: null,
    living_area_m2: null, rooms: null, floor: null, total_floors: null, construction_year: null,
    list_price: null, price_per_m2: null, monthly_fee: null, operating_cost: null,
    booli_estimate_low: null, booli_estimate_mid: null, booli_estimate_high: null,
    has_balcony: false, has_patio: false, has_elevator: false, has_fireplace: false, has_storage: false,
    published_date: null, showing_date: null,
    scraped_at: new Date().toISOString(),
  };
}

describe("runPhase2", () => {
  let db: Database;

  beforeEach(() => {
    db = initDatabase(":memory:");
  });

  test("all hrefs are processed exactly once", async () => {
    const hrefs = ["/bostad/101", "/bostad/102", "/bostad/103", "/bostad/104", "/bostad/105"];
    const called = new Set<string>();

    const scrapeDetail = async (href: string): Promise<NewListing | null> => {
      called.add(href);
      return null;
    };

    await runPhase2(scrapeDetail, hrefs, db, { concurrency: 3, delayMs: 0 });

    expect(called.size).toBe(5);
    for (const href of hrefs) {
      expect(called.has(href)).toBe(true);
    }
  });

  test("successfully scraped listings are inserted into DB", async () => {
    const hrefs = ["/bostad/101", "/bostad/102", "/bostad/103"];

    const scrapeDetail = async (href: string): Promise<NewListing | null> => {
      const id = parseInt(href.split("/")[2]!);
      return makeNewListing(id, "bostad");
    };

    await runPhase2(scrapeDetail, hrefs, db, { concurrency: 3, delayMs: 0 });

    const result = db.query("SELECT COUNT(*) as count FROM listings").get() as { count: number };
    expect(result.count).toBe(3);
  });

  test("null results are not inserted into DB", async () => {
    const hrefs = ["/bostad/101", "/bostad/102", "/bostad/103"];

    const scrapeDetail = async (href: string): Promise<NewListing | null> => {
      if (href === "/bostad/102") return null;
      const id = parseInt(href.split("/")[2]!);
      return makeNewListing(id, "bostad");
    };

    await runPhase2(scrapeDetail, hrefs, db, { concurrency: 3, delayMs: 0 });

    const result = db.query("SELECT COUNT(*) as count FROM listings").get() as { count: number };
    expect(result.count).toBe(2);
  });

  test("concurrency is limited to at most N concurrent calls", async () => {
    const hrefs = [
      "/bostad/101", "/bostad/102", "/bostad/103",
      "/bostad/104", "/bostad/105", "/bostad/106",
    ];

    let inFlight = 0;
    let peakConcurrency = 0;

    const scrapeDetail = async (href: string): Promise<NewListing | null> => {
      inFlight++;
      if (inFlight > peakConcurrency) peakConcurrency = inFlight;
      await Promise.resolve();
      inFlight--;
      return null;
    };

    await runPhase2(scrapeDetail, hrefs, db, { concurrency: 3, delayMs: 0 });

    expect(peakConcurrency).toBeLessThanOrEqual(3);
  });

  test("single failure does not abort the run", async () => {
    const hrefs = ["/bostad/101", "/bostad/102", "/bostad/103"];
    const attempted = new Set<string>();

    const scrapeDetail = async (href: string): Promise<NewListing | null> => {
      attempted.add(href);
      if (href === "/bostad/102") throw new Error("scrape failed");
      const id = parseInt(href.split("/")[2]!);
      return makeNewListing(id, "bostad");
    };

    await runPhase2(scrapeDetail, hrefs, db, { concurrency: 3, delayMs: 0 });

    expect(attempted.size).toBe(3);
    for (const href of hrefs) {
      expect(attempted.has(href)).toBe(true);
    }

    const result = db.query("SELECT COUNT(*) as count FROM listings").get() as { count: number };
    expect(result.count).toBe(2);
  });
});
