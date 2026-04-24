import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import type { Browser } from "playwright";

const TEXT_LIMIT = 15_000;

export function createBrowsePageTool(browser: Browser) {
  return createTool({
    id: "browse-page",
    description: "Navigate to a URL and extract page text and all links",
    inputSchema: z.object({ url: z.string().url() }),
    outputSchema: z.object({
      text: z.string(),
      links: z.array(z.object({ href: z.string(), label: z.string() })),
    }),
    execute: async ({ url }) => {
      const page = await browser.newPage();
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        const rawText = await page.evaluate(() => document.body.innerText);
        const text = rawText.slice(0, TEXT_LIMIT);
        const links = await page.$$eval("a[href]", (els) =>
          (els as HTMLAnchorElement[])
            .map((el) => ({ href: el.href, label: (el.textContent ?? "").trim() }))
            .filter((l) => l.href.startsWith("http"))
        );
        return { text, links };
      } finally {
        await page.close();
      }
    },
  });
}
