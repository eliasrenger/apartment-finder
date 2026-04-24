import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import type { Browser } from "playwright";

export function createGoogleSearchTool(browser: Browser) {
  return createTool({
    id: "google-search",
    description: "Search the web using DuckDuckGo and return top result URLs and titles",
    inputSchema: z.object({ query: z.string() }),
    outputSchema: z.object({
      results: z.array(z.object({ url: z.string(), title: z.string() })),
    }),
    execute: async ({ query }) => {
      const page = await browser.newPage();
      try {
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
        const results = await page.$$eval("a.result__a", (els) =>
          (els as HTMLAnchorElement[]).slice(0, 6).map((el) => ({
            href: el.href,
            label: (el.textContent ?? "").trim(),
          }))
        );
        return { results: results.map((r) => ({ url: r.href, title: r.label })) };
      } finally {
        await page.close();
      }
    },
  });
}
