import type { Database } from "bun:sqlite";
import { buildSearchUrl } from "../config/search-config";
import type { SearchConfig } from "../config/search-config";

const PAGINATION_HARD_CAP = 30;
const LOW_YIELD_THRESHOLD = 0.1; // 10%
const LOW_YIELD_CONSECUTIVE_LIMIT = 3;
const DEFAULT_DELAY_MS = 3_000;

const LISTING_HREF_RE = /href="(\/(bostad|annons)\/\d+)"/g;

function extractListingHrefs(html: string): string[] {
  const hrefs: string[] = [];
  const re = new RegExp(LISTING_HREF_RE.source, "g");
  let match;
  while ((match = re.exec(html)) !== null) {
    hrefs.push(match[1]!);
  }
  return [...new Set(hrefs)];
}

function parseHrefIdentity(href: string): { booliId: number; listingType: "bostad" | "annons" } | null {
  const match = href.match(/^\/(bostad|annons)\/(\d+)$/);
  if (!match) return null;
  return { booliId: Number(match[2]), listingType: match[1] as "bostad" | "annons" };
}

function isAlreadySeen(db: Database, booliId: number, listingType: string): boolean {
  const row = db
    .query<{ id: number }, [number, string]>(
      "SELECT id FROM listings WHERE booli_id = ? AND listing_type = ? LIMIT 1"
    )
    .get(booliId, listingType);
  return row !== null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(level: string, message: string, data?: Record<string, unknown>): void {
  console.log(JSON.stringify({ level, message, ...data, ts: new Date().toISOString() }));
}

function detectBlock(html: string): boolean {
  const lower = html.toLowerCase();
  return (
    lower.includes("just a moment") ||
    lower.includes("captcha") ||
    lower.includes("are you a robot") ||
    lower.includes("access denied") ||
    lower.includes("403 forbidden") ||
    lower.includes("too many requests") ||
    lower.includes("rate limit")
  );
}

export async function collectHrefs(
  fetchPage: (url: string) => Promise<string>,
  db: Database,
  config: SearchConfig,
  { delayMs = DEFAULT_DELAY_MS }: { delayMs?: number } = {}
): Promise<string[]> {
  const allNewHrefs: string[] = [];
  let consecutiveLowYield = 0;

  for (let page = 1; page <= PAGINATION_HARD_CAP; page++) {
    if (page > 1) await sleep(delayMs);

    const url = buildSearchUrl(config, page);

    // --- Fetch with one exception retry ---
    let html: string;
    try {
      html = await fetchPage(url);
    } catch (err) {
      log("warn", "Page fetch failed, retrying once", { page, err: String(err) });
      await sleep(delayMs);
      try {
        html = await fetchPage(url);
      } catch (retryErr) {
        log("error", "Page fetch failed after retry, stopping pagination", { page, err: String(retryErr) });
        break;
      }
    }

    let hrefs = extractListingHrefs(html!);

    // --- Empty page: check for block then retry once ---
    if (hrefs.length === 0) {
      if (detectBlock(html!)) {
        log("error", "Scraper is blocked — CAPTCHA or rate limit detected, stopping pagination", {
          page,
          url,
        });
        break;
      }
      await sleep(delayMs);
      try {
        const retryHtml = await fetchPage(url);
        hrefs = extractListingHrefs(retryHtml);
      } catch {
        hrefs = [];
      }

      if (hrefs.length === 0) {
        if (page === 1) {
          const blocked = detectBlock(html!);
          log("warn",
            blocked
              ? "Page 1 returned no listings — scraper is likely blocked (CAPTCHA or rate limit detected in response)"
              : "Page 1 returned no listings after retry — check search config or site availability",
            { page, likelyBlocked: blocked }
          );
        }
        break;
      }
    }

    // --- Deduplicate against DB ---
    const newHrefs = hrefs.filter((href) => {
      const identity = parseHrefIdentity(href);
      if (!identity) return false;
      return !isAlreadySeen(db, identity.booliId, identity.listingType);
    });

    allNewHrefs.push(...newHrefs);

    // --- Early-stop check ---
    const yieldRatio = newHrefs.length / hrefs.length;
    if (yieldRatio < LOW_YIELD_THRESHOLD) {
      consecutiveLowYield++;
      if (consecutiveLowYield >= LOW_YIELD_CONSECUTIVE_LIMIT) {
        log("info", "Early stop: 3 consecutive low-yield pages", { page, yieldRatio });
        break;
      }
    } else {
      consecutiveLowYield = 0;
    }
  }

  return allNewHrefs;
}
