import type { Database } from "bun:sqlite";
import { chromium } from "playwright";
import type { Browser, Page } from "playwright";
import type { SearchConfig } from "../config/search-config";
import { collectHrefs } from "./collect-hrefs";
import { scrapeDetailPage } from "./scrape-detail";
import { runPhase2 } from "./run-phase2";

export { collectHrefs, scrapeDetailPage, runPhase2 };

async function fetchViaPage(page: Page, url: string): Promise<string> {
  await page.goto(url, { waitUntil: "networkidle" });
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
