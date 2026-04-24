import { Agent } from "@mastra/core/agent";
import type { Browser } from "playwright";
import { createBrowsePageTool } from "./tools/browse-page";
import { createReadPdfTool } from "./tools/read-pdf";
import { createGoogleSearchTool } from "./tools/google-search";

const SYSTEM_PROMPT = `You are an expert apartment analyst for the Swedish housing market.
Your job is to research an apartment listing and decide whether the user should be notified about it.

## Research strategy

1. Visit the booli.se listing URL provided in the prompt
2. On the booli page, look for the BRF (bostadsrättsförening) name and any link to its website
3. Navigate to the BRF website and find the latest annual report (årsredovisning) — usually a PDF link
4. Read the annual report PDF and extract the key financial data listed below
5. If you cannot find the BRF website from the booli page, use googleSearch with queries like:
   "<brf_name> årsredovisning" or "<brf_name> hemsida" or "<brf_name> bostadsrättsförening"

## What to extract and evaluate

From the BRF annual report:
- Soliditet (equity ratio) — higher is better; above 15% is healthy
- Skuld per kvm (debt per sqm) — lower is better; below 5 000 kr/kvm is good
- Avgiftsutveckling (monthly fee trend) — stable or decreasing is good; rapid increases are a risk
- Planerade renoveringar (pending renovations) — major upcoming costs reduce value
- Årets resultat (operating surplus/deficit) — surplus is good
- Räntebindning (loan renegotiation dates) — when loans reprice and at what expected rates
- General interest rate exposure and refinancing risk

From the listing data provided:
- Score (already captures price, area, floor, amenities)
- Address, neighbourhood, floor, rooms, area, monthly fee, list price

## Verdict logic

Make a holistic judgment:
- Notify if BRF financials are excellent, regardless of lifestyle factors
- Notify if BRF financials are decent AND lifestyle signals are strong
- Do NOT notify if only lifestyle factors are strong but financials are weak
- If BRF info is unavailable but all other signals (price, score, lifestyle) are very strong,
  you MAY notify — but you MUST note in the explanation that BRF data was not available
- Do not notify if nothing stands out

## Output format

Respond with ONLY valid JSON — no markdown fences, no text outside the JSON:
{"notifyUser": boolean, "explanation": "2-5 sentences covering what data you found, what drove the verdict, and what was missing"}`;

export function createListingAgent(browser: Browser) {
  return new Agent({
    name: "listing-analyst",
    instructions: SYSTEM_PROMPT,
    model: "anthropic/claude-sonnet-4-6",
    tools: {
      browsePage: createBrowsePageTool(browser),
      readPdf: createReadPdfTool(),
      googleSearch: createGoogleSearchTool(browser),
    },
  });
}
