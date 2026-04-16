import type { Database } from "bun:sqlite";
import type { NewListing } from "../storage/schemas";
import { insertListing } from "../storage/listings";

const DEFAULT_CONCURRENCY = 3;
const DEFAULT_DELAY_MS = 3_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(level: string, message: string, data?: Record<string, unknown>): void {
  console.log(JSON.stringify({ level, message, ...data, ts: new Date().toISOString() }));
}

export async function runPhase2(
  scrapeDetail: (href: string) => Promise<NewListing | null>,
  hrefs: string[],
  db: Database,
  {
    concurrency = DEFAULT_CONCURRENCY,
    delayMs = DEFAULT_DELAY_MS,
  }: { concurrency?: number; delayMs?: number } = {}
): Promise<void> {
  let index = 0;

  async function worker(): Promise<void> {
    while (index < hrefs.length) {
      const href = hrefs[index++]!;
      if (delayMs > 0) await sleep(delayMs);
      try {
        const listing = await scrapeDetail(href);
        if (listing !== null) {
          insertListing(db, listing);
        }
      } catch (err) {
        log("error", "Detail page scrape failed, skipping", { href, err: String(err) });
      }
    }
  }

  const workerCount = Math.min(concurrency, hrefs.length);
  if (workerCount === 0) return;

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
}
