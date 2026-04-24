import { test, expect } from "bun:test";
import { createGoogleSearchTool } from "../../src/agent/tools/google-search";

function makeMockBrowser(results: { href: string; label: string }[] = []) {
  return {
    newPage: async () => ({
      goto: async () => {},
      $$eval: async (_sel: string, _fn: unknown) => results,
      close: async () => {},
    }),
  } as any;
}

test("googleSearch: returns results array with url and label", async () => {
  const mockResults = [
    { href: "https://brf-solsidan.se", label: "BRF Solsidan — Välkommen" },
    { href: "https://other.se", label: "Other site" },
  ];
  const tool = createGoogleSearchTool(makeMockBrowser(mockResults));
  const result = await tool.execute!({ query: "BRF Solsidan hemsida" } as any, {} as any);
  expect(result.results).toHaveLength(2);
  expect(result.results[0].url).toBe("https://brf-solsidan.se");
  expect(result.results[0].title).toBe("BRF Solsidan — Välkommen");
});

test("googleSearch: returns empty array when no results found", async () => {
  const tool = createGoogleSearchTool(makeMockBrowser([]));
  const result = await tool.execute!({ query: "something obscure" } as any, {} as any);
  expect(result.results).toEqual([]);
});
