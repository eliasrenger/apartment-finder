import { test, expect } from "bun:test";
import { createReadPdfTool } from "../../src/agent/tools/read-pdf";

test("readPdf: extracts text via the injected extractor", async () => {
  const tool = createReadPdfTool(async (_url: string) => ({
    text: "BRF soliditet 18%\nSkuld per kvm 3500 kr",
  }));
  const result = await tool.execute!({ url: "https://brf.se/report.pdf" } as any, {} as any);
  expect(result.text).toContain("soliditet");
});

test("readPdf: truncates text at 20000 characters", async () => {
  const longText = "x".repeat(25_000);
  const tool = createReadPdfTool(async (_url: string) => ({ text: longText }));
  const result = await tool.execute!({ url: "https://brf.se/report.pdf" } as any, {} as any);
  expect(result.text.length).toBe(20_000);
});
