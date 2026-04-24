import type { Database } from "bun:sqlite";
import { chromium } from "playwright";
import type { Browser, Page } from "playwright";
import type { SearchConfig } from "../config/search-config";
import { collectHrefs } from "./collect-hrefs";
import { scrapeDetailPage } from "./scrape-detail";
import { runPhase2 } from "./run-phase2";

export { collectHrefs, scrapeDetailPage, runPhase2 };

function log(level: string, message: string, data?: Record<string, unknown>): void {
  console.log(JSON.stringify({ level, message, ...data, ts: new Date().toISOString() }));
}

async function fetchViaPage(page: Page, url: string): Promise<string> {
  const response = await page.goto(url, { waitUntil: "networkidle" });
  if (response && response.status() !== 200) {
    log("warn", "Non-200 response from booli.se — possible block or rate limit", {
      url,
      status: response.status(),
    });
  }
  return page.content();
}

export async function runScraper(db: Database, config: SearchConfig): Promise<void> {
  const browser: Browser = await chromium.launch({ headless: true });

  try {
    // Phase 1 — sequential search page navigation using a single tab
    const phase1Page = await browser.newPage();
    const hrefs = await collectHrefs(
      (url) => fetchViaPage(phase1Page, url),
      db,
      config
    );
    await phase1Page.close();

    // Phase 2 — concurrent detail page scraping, each call opens and closes its own tab
    await runPhase2(
      (href) =>
        scrapeDetailPage(async (url) => {
          const page = await browser.newPage();
          try {
            return await fetchViaPage(page, url);
          } finally {
            await page.close();
          }
        }, href),
      hrefs,
      db
    );
  } finally {
    await browser.close();
  }
}
