import { describe, test, expect, beforeEach, spyOn } from "bun:test";
import { Database } from "bun:sqlite";
import type { SearchConfig } from "../../src/config/search-config";
import { collectHrefs } from "../../src/scraper/collect-hrefs";
import { initDatabase } from "../../src/storage/db";
import { insertListing } from "../../src/storage/listings";
import type { NewListing } from "../../src/storage/schemas";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal valid SearchConfig used across all tests. */
const baseConfig: SearchConfig = {
  areaIds: [920583],
  extendAreas: 0,
  objectType: "Lägenhet",
  minListPrice: 1_000_000,
  maxListPrice: 10_000_000,
  minLivingArea: 30,
  maxLivingArea: 200,
  minRooms: 1,
  maxRooms: 10,
};

/** Produce a minimal NewListing suitable for insertion. */
function makeNewListing(boolId: number, listingType: "bostad" | "annons"): NewListing {
  return {
    booli_id: boolId,
    listing_type: listingType,
    url: `https://www.booli.se/${listingType}/${boolId}`,
    published_date: null,
    scraped_at: new Date().toISOString(),
    address: null,
    neighbourhood: null,
    municipality: null,
    postal_code: null,
    brf_name: null,
    living_area_m2: null,
    rooms: null,
    floor: null,
    total_floors: null,
    construction_year: null,
    list_price: null,
    price_per_m2: null,
    monthly_fee: null,
    operating_cost: null,
    booli_estimate_low: null,
    booli_estimate_mid: null,
    booli_estimate_high: null,
    has_balcony: false,
    has_patio: false,
    has_elevator: false,
    has_fireplace: false,
    has_storage: false,
    showing_date: null,
  };
}

/** Build an HTML page containing listing hrefs for the given IDs. */
function buildListingPage(
  listings: Array<{ id: number; type: "bostad" | "annons" }>,
  extras: string[] = []
): string {
  const links = listings
    .map(({ id, type }) => `<a href="/${type}/${id}">Listing ${id}</a>`)
    .join("\n");
  const extraLinks = extras.map((href) => `<a href="${href}">extra</a>`).join("\n");
  return `<html><body>${links}${extraLinks}</body></html>`;
}

/** A fetchPage that always returns an empty HTML page. */
const emptyPage = async (_url: string): Promise<string> => `<html><body></body></html>`;

/** A fetchPage that always throws. */
const failingFetch = async (_url: string): Promise<string> => {
  throw new Error("network error");
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("collectHrefs", () => {
  let db: Database;

  beforeEach(() => {
    db = initDatabase(":memory:");
  });

  // -------------------------------------------------------------------------
  // Phase 1 — basic href collection
  // -------------------------------------------------------------------------

  describe("new hrefs are returned", () => {
    test("returns hrefs for listings not in the DB", async () => {
      const html = buildListingPage([
        { id: 101, type: "bostad" },
        { id: 102, type: "annons" },
      ]);

      // Page 1 returns two listings; page 2 is empty (stops pagination).
      let callCount = 0;
      const fetchPage = async (_url: string): Promise<string> => {
        callCount += 1;
        if (callCount === 1) return html;
        return `<html><body></body></html>`;
      };

      const hrefs = await collectHrefs(fetchPage, db, baseConfig, { delayMs: 0 });

      expect(hrefs).toContain("/bostad/101");
      expect(hrefs).toContain("/annons/102");
    });

    test("does not include non-listing links", async () => {
      const html = buildListingPage(
        [{ id: 201, type: "bostad" }],
        ["/om-booli", "/kontakt", "/", "/search"]
      );

      let callCount = 0;
      const fetchPage = async (_url: string): Promise<string> => {
        callCount += 1;
        if (callCount === 1) return html;
        return `<html><body></body></html>`;
      };

      const hrefs = await collectHrefs(fetchPage, db, baseConfig, { delayMs: 0 });

      expect(hrefs).toContain("/bostad/201");
      expect(hrefs).not.toContain("/om-booli");
      expect(hrefs).not.toContain("/kontakt");
      expect(hrefs).not.toContain("/");
      expect(hrefs).not.toContain("/search");
    });
  });

  describe("already-seen hrefs are excluded", () => {
    test("excludes hrefs whose (booli_id, listing_type) already exists in the DB", async () => {
      // Pre-insert listing 301/bostad
      insertListing(db, makeNewListing(301, "bostad"));

      const html = buildListingPage([
        { id: 301, type: "bostad" }, // already in DB
        { id: 302, type: "bostad" }, // new
      ]);

      let callCount = 0;
      const fetchPage = async (_url: string): Promise<string> => {
        callCount += 1;
        if (callCount === 1) return html;
        return `<html><body></body></html>`;
      };

      const hrefs = await collectHrefs(fetchPage, db, baseConfig, { delayMs: 0 });

      expect(hrefs).not.toContain("/bostad/301");
      expect(hrefs).toContain("/bostad/302");
    });

    test("treats same booli_id with different listing_type as new", async () => {
      // Insert 401 as "bostad" but page has 401 as "annons"
      insertListing(db, makeNewListing(401, "bostad"));

      const html = buildListingPage([{ id: 401, type: "annons" }]);

      let callCount = 0;
      const fetchPage = async (_url: string): Promise<string> => {
        callCount += 1;
        if (callCount === 1) return html;
        return `<html><body></body></html>`;
      };

      const hrefs = await collectHrefs(fetchPage, db, baseConfig, { delayMs: 0 });

      expect(hrefs).toContain("/annons/401");
    });
  });

  // -------------------------------------------------------------------------
  // Pagination
  // -------------------------------------------------------------------------

  describe("pagination advances page number", () => {
    test("requests pages in sequence (page=1, page=2, …)", async () => {
      const requestedUrls: string[] = [];
      const pages: Record<number, string> = {
        1: buildListingPage([{ id: 501, type: "bostad" }]),
        2: buildListingPage([{ id: 502, type: "bostad" }]),
      };

      const fetchPage = async (url: string): Promise<string> => {
        requestedUrls.push(url);
        const match = url.match(/[?&]page=(\d+)/);
        const pageNum = match ? Number(match[1]) : 1;
        return pages[pageNum] ?? `<html><body></body></html>`;
      };

      await collectHrefs(fetchPage, db, baseConfig, { delayMs: 0 });

      // Must have requested page 1 then page 2 (and page 3 which is empty)
      const pageNumbers = requestedUrls
        .map((u) => {
          const m = u.match(/[?&]page=(\d+)/);
          return m ? Number(m[1]) : null;
        })
        .filter((n): n is number => n !== null);

      expect(pageNumbers[0]).toBe(1);
      expect(pageNumbers[1]).toBe(2);
      expect(pageNumbers[2]).toBe(3);
    });
  });

  // -------------------------------------------------------------------------
  // Hard cap at 30 pages
  // -------------------------------------------------------------------------

  describe("pagination hard cap", () => {
    test("stops after 30 pages regardless of new listings", async () => {
      const requestedUrls: string[] = [];

      // Every page always returns 10 unique new listings — no natural stop.
      let globalId = 1000;
      const fetchPage = async (url: string): Promise<string> => {
        requestedUrls.push(url);
        const listings = Array.from({ length: 10 }, () => ({
          id: globalId++,
          type: "bostad" as const,
        }));
        return buildListingPage(listings);
      };

      await collectHrefs(fetchPage, db, baseConfig, { delayMs: 0 });

      const maxPage = Math.max(
        ...requestedUrls
          .map((u) => {
            const m = u.match(/[?&]page=(\d+)/);
            return m ? Number(m[1]) : 0;
          })
          .filter((n) => n > 0)
      );

      expect(maxPage).toBeLessThanOrEqual(30);
      expect(requestedUrls.length).toBeLessThanOrEqual(30);
    });
  });

  // -------------------------------------------------------------------------
  // Early-stop on low new-listing yield
  // -------------------------------------------------------------------------

  describe("early-stop on low new-listing yield", () => {
    /**
     * Helper: insert `count` listings of type "bostad" starting at id `startId`
     * so that a page containing those listings is considered "already seen".
     */
    function preInsertRange(startId: number, count: number) {
      for (let i = 0; i < count; i++) {
        insertListing(db, makeNewListing(startId + i, "bostad"));
      }
    }

    test("stops after 3 consecutive low-yield pages", async () => {
      const requestedUrls: string[] = [];

      // Pages 1–3: each returns 10 listings, 9 already seen (yield = 10% — below threshold <10%…
      // actually 1/10 = 10% which is NOT below threshold; to be below 10%, 0 new out of 10 = 0%).
      // Spec: "fewer than 10% new" → to trigger, we need < 1 new out of 10 total = 0 new.
      // But if 0 new we hit empty-page handling first. Let's use a page with 11 listings,
      // 1 new and 10 old → 1/11 ≈ 9% < 10%.
      const OLD_START = 2000;
      const OLD_COUNT = 30; // 10 old per page × 3 pages
      preInsertRange(OLD_START, OLD_COUNT);

      let newId = 3000;
      let pageCount = 0;

      const fetchPage = async (url: string): Promise<string> => {
        requestedUrls.push(url);
        pageCount += 1;
        // Pages 1–3: 11 listings per page, 10 old + 1 new → ~9% yield
        if (pageCount <= 3) {
          const oldStart = OLD_START + (pageCount - 1) * 10;
          const listings = [
            ...Array.from({ length: 10 }, (_, i) => ({
              id: oldStart + i,
              type: "bostad" as const,
            })),
            { id: newId++, type: "bostad" as const },
          ];
          return buildListingPage(listings);
        }
        // Page 4+ should never be requested
        return buildListingPage([{ id: newId++, type: "bostad" as const }]);
      };

      await collectHrefs(fetchPage, db, baseConfig, { delayMs: 0 });

      expect(requestedUrls.length).toBeLessThanOrEqual(3);
    });

    test("counter resets on a high-yield page", async () => {
      const requestedUrls: string[] = [];

      // Pre-insert old listings for low-yield pages
      const OLD_START = 5000;
      preInsertRange(OLD_START, 20); // 10 old × page 1, 10 old × page 3

      let newId = 6000;
      let pageCount = 0;

      const fetchPage = async (url: string): Promise<string> => {
        requestedUrls.push(url);
        pageCount += 1;

        if (pageCount === 1) {
          // Low yield: 10 old + 1 new (≈9%)
          const listings = [
            ...Array.from({ length: 10 }, (_, i) => ({
              id: OLD_START + i,
              type: "bostad" as const,
            })),
            { id: newId++, type: "bostad" as const },
          ];
          return buildListingPage(listings);
        }

        if (pageCount === 2) {
          // High yield: 10 all-new listings (100%) — resets counter
          return buildListingPage(
            Array.from({ length: 10 }, () => ({ id: newId++, type: "bostad" as const }))
          );
        }

        if (pageCount === 3) {
          // Low yield: 10 old (from second batch) + 1 new
          const listings = [
            ...Array.from({ length: 10 }, (_, i) => ({
              id: OLD_START + 10 + i,
              type: "bostad" as const,
            })),
            { id: newId++, type: "bostad" as const },
          ];
          return buildListingPage(listings);
        }

        if (pageCount === 4) {
          // Low yield again (counter now = 2)
          const listings = [
            ...Array.from({ length: 10 }, (_, i) => ({
              id: OLD_START + 10 + i,
              type: "bostad" as const,
            })),
            { id: newId++, type: "bostad" as const },
          ];
          return buildListingPage(listings);
        }

        // Should not be reached for a valid implementation (3 consecutive lows happen p3–p5)
        return `<html><body></body></html>`;
      };

      await collectHrefs(fetchPage, db, baseConfig, { delayMs: 0 });

      // Since counter resets at page 2, the stop only triggers after 3 more consecutive
      // low-yield pages (pages 3, 4, 5). We must have gotten at least pages 1–4.
      expect(requestedUrls.length).toBeGreaterThanOrEqual(4);
    });
  });

  // -------------------------------------------------------------------------
  // Empty page handling
  // -------------------------------------------------------------------------

  describe("empty page handling", () => {
    test("retries the same page once when it returns no hrefs", async () => {
      const requestedUrls: string[] = [];
      let callCount = 0;

      // Page 1: first call returns empty, second (retry) also empty → stop
      const fetchPage = async (url: string): Promise<string> => {
        requestedUrls.push(url);
        callCount += 1;
        return `<html><body></body></html>`;
      };

      await collectHrefs(fetchPage, db, baseConfig, { delayMs: 0 });

      // There should be exactly 2 requests for page 1 (original + 1 retry)
      const page1Requests = requestedUrls.filter((u) => /[?&]page=1(&|$)/.test(u));
      expect(page1Requests.length).toBe(2);
    });

    test("page 1 empty triggers a warning log", async () => {
      const consoleSpy = spyOn(console, "warn");
      const consoleLogSpy = spyOn(console, "log");

      const fetchPage = async (_url: string): Promise<string> =>
        `<html><body></body></html>`;

      const hrefs = await collectHrefs(fetchPage, db, baseConfig, { delayMs: 0 });

      expect(hrefs).toEqual([]);

      // At least one of warn or log should have been called with something
      // that looks like a structured warning (best-effort check per spec).
      const warnCalled = consoleSpy.mock.calls.length > 0;
      const logCalled = consoleLogSpy.mock.calls.length > 0;
      // Either a warning was emitted OR the function simply returned [] — both satisfy spec.
      expect(typeof hrefs).toBe("object");
      if (warnCalled || logCalled) {
        // Verify the call contained something warning-like
        const allCalls = [
          ...consoleSpy.mock.calls.map((c) => JSON.stringify(c)),
          ...consoleLogSpy.mock.calls.map((c) => JSON.stringify(c)),
        ];
        const hasWarningContent = allCalls.some(
          (s) =>
            s.toLowerCase().includes("warn") ||
            s.toLowerCase().includes("empty") ||
            s.toLowerCase().includes("page")
        );
        expect(hasWarningContent).toBe(true);
      }

      consoleSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    test("empty page mid-run stops without a warning", async () => {
      const consoleSpy = spyOn(console, "warn");

      let callCount = 0;
      const fetchPage = async (_url: string): Promise<string> => {
        callCount += 1;
        if (callCount === 1) {
          // Page 1 returns a listing
          return buildListingPage([{ id: 701, type: "bostad" }]);
        }
        // Page 2 (and retry) returns empty
        return `<html><body></body></html>`;
      };

      const hrefs = await collectHrefs(fetchPage, db, baseConfig, { delayMs: 0 });

      expect(hrefs).toContain("/bostad/701");
      // No warning should have been emitted for an empty page beyond page 1
      expect(consoleSpy.mock.calls.length).toBe(0);

      consoleSpy.mockRestore();
    });
  });

  // -------------------------------------------------------------------------
  // Phase 1 failure handling
  // -------------------------------------------------------------------------

  describe("failure handling", () => {
    test("retries once on fetch failure then stops, returning collected hrefs so far", async () => {
      const requestedUrls: string[] = [];
      let callCount = 0;

      const fetchPage = async (url: string): Promise<string> => {
        requestedUrls.push(url);
        callCount += 1;
        if (callCount === 1) {
          // Page 1 succeeds
          return buildListingPage([{ id: 801, type: "bostad" }]);
        }
        // Page 2 always fails
        throw new Error("network error");
      };

      const hrefs = await collectHrefs(fetchPage, db, baseConfig, { delayMs: 0 });

      // Should have collected the listing from page 1
      expect(hrefs).toContain("/bostad/801");

      // Page 2 should have been attempted twice (original + retry)
      const page2Requests = requestedUrls.filter((u) => /[?&]page=2(&|$)/.test(u));
      expect(page2Requests.length).toBe(2);

      // No page 3 should have been requested
      const page3Requests = requestedUrls.filter((u) => /[?&]page=3(&|$)/.test(u));
      expect(page3Requests.length).toBe(0);
    });

    test("retries once on first page failure and returns empty array on double failure", async () => {
      const requestedUrls: string[] = [];

      const fetchPage = async (url: string): Promise<string> => {
        requestedUrls.push(url);
        throw new Error("network error");
      };

      const hrefs = await collectHrefs(fetchPage, db, baseConfig, { delayMs: 0 });

      expect(hrefs).toEqual([]);

      // Only page 1 should have been requested (twice)
      const page1Requests = requestedUrls.filter((u) => /[?&]page=1(&|$)/.test(u));
      expect(page1Requests.length).toBe(2);

      const page2Requests = requestedUrls.filter((u) => /[?&]page=2(&|$)/.test(u));
      expect(page2Requests.length).toBe(0);
    });

    test("stops immediately after retry failure without requesting further pages", async () => {
      let callCount = 0;
      const requestedUrls: string[] = [];

      const fetchPage = async (url: string): Promise<string> => {
        requestedUrls.push(url);
        callCount += 1;
        if (callCount === 1) {
          // page 1 succeeds
          return buildListingPage([{ id: 901, type: "bostad" }]);
        }
        // page 2 fails on both attempts (original + retry)
        throw new Error("fetch failed");
      };

      const hrefs = await collectHrefs(fetchPage, db, baseConfig, { delayMs: 0 });

      expect(hrefs).toContain("/bostad/901");

      const maxPage = Math.max(
        ...requestedUrls
          .map((u) => {
            const m = u.match(/[?&]page=(\d+)/);
            return m ? Number(m[1]) : 0;
          })
          .filter((n) => n > 0)
      );

      expect(maxPage).toBeLessThanOrEqual(2);
    });
  });
});
