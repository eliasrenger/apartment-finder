import type { Database } from "bun:sqlite";
import type { AnalysisConfig } from "../config/search-config";
import { insertAnalysis } from "../storage";

interface EligibleListing {
  id: number;
  url: string;
  address: string | null;
  neighbourhood: string | null;
  rooms: number | null;
  floor: number | null;
  living_area_m2: number | null;
  list_price: number | null;
  monthly_fee: number | null;
  brf_name: string | null;
  total_score: number;
}

function getEligibleListings(db: Database, scoreThreshold: number): EligibleListing[] {
  return db
    .query<EligibleListing, [number]>(
      `SELECT l.id, l.url, l.address, l.neighbourhood, l.rooms, l.floor,
              l.living_area_m2, l.list_price, l.monthly_fee, l.brf_name,
              s.total_score
       FROM listings l
       JOIN scores s ON s.listing_id = l.id
       WHERE s.total_score >= ?
         AND NOT EXISTS (SELECT 1 FROM analyses a WHERE a.listing_id = l.id)
       ORDER BY s.total_score DESC`
    )
    .all(scoreThreshold);
}

function buildPrompt(listing: EligibleListing): string {
  return `Analyse this apartment listing and decide whether to notify the user:

URL: ${listing.url}
Address: ${listing.address ?? "Unknown"}
Neighbourhood: ${listing.neighbourhood ?? "Unknown"}
Rooms: ${listing.rooms ?? "Unknown"}
Floor: ${listing.floor ?? "Unknown"}
Area: ${listing.living_area_m2 ?? "Unknown"} m²
List price: ${listing.list_price?.toLocaleString("sv-SE") ?? "Unknown"} kr
Monthly fee: ${listing.monthly_fee?.toLocaleString("sv-SE") ?? "Unknown"} kr/month
BRF name: ${listing.brf_name ?? "Unknown"}
Score: ${listing.total_score}/100`;
}

export function parseAgentResult(text: string): { notifyUser: boolean; explanation: string } {
  const cleaned = text.replace(/^```(?:json)?\s*/m, "").replace(/```\s*$/m, "").trim();
  const parsed = JSON.parse(cleaned);
  return {
    notifyUser: Boolean(parsed.notifyUser),
    explanation: String(parsed.explanation ?? ""),
  };
}

type GenerateFn = (prompt: string) => Promise<{ text: string }>;

export async function runAnalysis(
  db: Database,
  config: AnalysisConfig,
  generateFn?: GenerateFn
): Promise<number[]> {
  const listings = getEligibleListings(db, config.scoreThreshold);
  if (listings.length === 0) return [];

  let generate: GenerateFn;
  let browserClose: (() => Promise<void>) | undefined;

  if (generateFn) {
    generate = generateFn;
  } else {
    const { chromium } = await import("playwright");
    const { createListingAgent } = await import("./agent");
    const browser = await chromium.launch();
    browserClose = () => browser.close();
    const agent = createListingAgent(browser);
    generate = (prompt) => agent.generate(prompt, { maxSteps: config.maxSteps });
  }

  const analysedIds: number[] = [];

  try {
    for (const listing of listings) {
      try {
        const response = await generate(buildPrompt(listing));
        const result = parseAgentResult(response.text);
        insertAnalysis(db, {
          listing_id: listing.id,
          result: JSON.stringify(result),
          analysed_at: new Date().toISOString(),
        });
        analysedIds.push(listing.id);
      } catch (err) {
        console.log(
          JSON.stringify({
            level: "error",
            message: "Analysis failed for listing",
            listing_id: listing.id,
            err: String(err),
            ts: new Date().toISOString(),
          })
        );
      }
    }
  } finally {
    await browserClose?.();
  }

  return analysedIds;
}
