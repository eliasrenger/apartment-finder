import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { extractText as unpdfExtract } from "unpdf";

const TEXT_LIMIT = 20_000;

type ExtractFn = (url: string) => Promise<{ text: string }>;

async function defaultExtract(url: string): Promise<{ text: string }> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.status} ${url}`);
  const buf = new Uint8Array(await response.arrayBuffer());
  const { text } = await unpdfExtract(buf, { mergePages: true });
  return { text };
}

export function createReadPdfTool(extractFn: ExtractFn = defaultExtract) {
  return createTool({
    id: "read-pdf",
    description: "Fetch a PDF from a URL and extract its text content",
    inputSchema: z.object({ url: z.string().url() }),
    outputSchema: z.object({ text: z.string() }),
    execute: async ({ url }) => {
      const { text } = await extractFn(url);
      return { text: text.slice(0, TEXT_LIMIT) };
    },
  });
}

export const readPdfTool = createReadPdfTool();
