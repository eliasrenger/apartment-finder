import { test, expect } from "bun:test";
import { createBrowsePageTool } from "../../src/agent/tools/browse-page";

function makeMockBrowser(overrides: { text?: string; links?: { href: string; label: string }[] } = {}) {
  const text = overrides.text ?? "Hello from the page";
  const links = overrides.links ?? [{ href: "https://example.com/about", label: "About" }];

  return {
    newPage: async () => ({
      goto: async () => {},
      evaluate: async (_fn: () => string) => text,
      $$eval: async (_sel: string, _fn: unknown) => links,
      close: async () => {},
    }),
  } as any;
}

test("browsePage: returns text from page", async () => {
  const tool = createBrowsePageTool(makeMockBrowser({ text: "Some content" }));
  const result = await tool.execute!({ url: "https://example.com" } as any, {} as any);
  expect(result.text).toBe("Some content");
});

test("browsePage: returns links from page", async () => {
  const links = [
    { href: "https://brf.se", label: "BRF Solsidan" },
    { href: "https://other.se", label: "Other" },
  ];
  const tool = createBrowsePageTool(makeMockBrowser({ links }));
  const result = await tool.execute!({ url: "https://example.com" } as any, {} as any);
  expect(result.links).toEqual(links);
});

test("browsePage: truncates text at 15000 characters", async () => {
  const longText = "a".repeat(20000);
  const tool = createBrowsePageTool(makeMockBrowser({ text: longText }));
  const result = await tool.execute!({ url: "https://example.com" } as any, {} as any);
  expect(result.text.length).toBe(15000);
});
