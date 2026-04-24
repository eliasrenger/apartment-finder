import type { NewListing } from "../storage/schemas";

const BASE_URL = "https://www.booli.se";

function extractText(html: string, testId: string): string | null {
  const re = new RegExp(`data-testid="${testId}"[^>]*>([^<]*)<`);
  const match = html.match(re);
  if (!match) return null;
  const value = match[1]!.trim();
  return value.length > 0 ? value : null;
}

function extractNumber(html: string, testId: string): number | null {
  const text = extractText(html, testId);
  if (text === null) return null;
  const n = Number(text.replace(/\s/g, ""));
  return isNaN(n) ? null : n;
}

function hasElement(html: string, testId: string): boolean {
  return html.includes(`data-testid="${testId}"`);
}

function parseHref(href: string): { booliId: number; listingType: "bostad" | "annons" } | null {
  const match = href.match(/^\/(bostad|annons)\/(\d+)$/);
  if (!match) return null;
  return { booliId: Number(match[2]), listingType: match[1] as "bostad" | "annons" };
}

function extractListing(html: string, href: string): NewListing | null {
  const identity = parseHref(href);
  if (!identity) return null;

  return {
    booli_id: identity.booliId,
    listing_type: identity.listingType,
    url: `${BASE_URL}${href}`,
    address: extractText(html, "address"),
    neighbourhood: extractText(html, "neighbourhood"),
    municipality: extractText(html, "municipality"),
    postal_code: extractText(html, "postalCode"),
    brf_name: extractText(html, "brfName"),
    living_area_m2: extractNumber(html, "livingArea"),
    rooms: extractNumber(html, "rooms"),
    floor: extractNumber(html, "floor"),
    total_floors: extractNumber(html, "totalFloors"),
    construction_year: extractNumber(html, "constructionYear"),
    list_price: extractNumber(html, "listPrice"),
    price_per_m2: extractNumber(html, "pricePerM2"),
    monthly_fee: extractNumber(html, "monthlyFee"),
    operating_cost: extractNumber(html, "operatingCost"),
    booli_estimate_low: extractNumber(html, "estimateLow"),
    booli_estimate_mid: extractNumber(html, "estimateMid"),
    booli_estimate_high: extractNumber(html, "estimateHigh"),
    has_balcony: hasElement(html, "amenity-balcony"),
    has_patio: hasElement(html, "amenity-patio"),
    has_elevator: hasElement(html, "amenity-elevator"),
    has_fireplace: hasElement(html, "amenity-fireplace"),
    has_storage: hasElement(html, "amenity-storage"),
    published_date: extractText(html, "publishedDate"),
    showing_date: extractText(html, "showingDate"),
    scraped_at: new Date().toISOString(),
  };
}

export async function scrapeDetailPage(
  fetchPage: (url: string) => Promise<string>,
  href: string
): Promise<NewListing | null> {
  const url = `${BASE_URL}${href}`;

  let html: string;
  try {
    html = await fetchPage(url);
  } catch (err) {
    try {
      html = await fetchPage(url);
    } catch (retryErr) {
      console.log(JSON.stringify({ level: "error", message: "Detail page fetch failed after retry", href, err: String(retryErr), ts: new Date().toISOString() }));
      return null;
    }
  }

  return extractListing(html!, href);
}
