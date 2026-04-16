import { describe, test, expect, spyOn } from "bun:test";
import type { NewListing } from "../../src/storage/schemas";
import { scrapeDetailPage } from "../../src/scraper/scrape-detail";

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

const fixtureHtml = await Bun.file(
  new URL("../fixtures/listing-detail.html", import.meta.url).pathname
).text();

/** Minimal HTML with only address and listPrice present. */
const minimalHtml = `<!DOCTYPE html>
<html lang="sv">
<head><meta charset="UTF-8"><title>Minimal</title></head>
<body>
  <main id="listing-detail">
    <span data-testid="address">Minimal Street 1</span>
    <span data-testid="listPrice">2000000</span>
  </main>
</body>
</html>`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("scrapeDetailPage", () => {
  test("extracts all fields correctly from fixture HTML", async () => {
    const fetchPage = async (_url: string): Promise<string> => fixtureHtml;

    const result = await scrapeDetailPage(fetchPage, "/bostad/789456");

    expect(result).not.toBeNull();
    const listing = result as NewListing;

    // Identity
    expect(listing.booli_id).toBe(789456);
    expect(listing.listing_type).toBe("bostad");
    expect(listing.url).toBe("https://www.booli.se/bostad/789456");

    // String fields
    expect(listing.address).toBe("Storgatan 12");
    expect(listing.neighbourhood).toBe("Södermalm");
    expect(listing.municipality).toBe("Stockholm");
    expect(listing.postal_code).toBe("116 30");
    expect(listing.brf_name).toBe("BRF Storgatan");

    // Physical characteristics
    expect(listing.living_area_m2).toBe(65);
    expect(listing.rooms).toBe(3);
    expect(listing.floor).toBe(4);
    expect(listing.total_floors).toBe(7);
    expect(listing.construction_year).toBe(1965);

    // Financials
    expect(listing.list_price).toBe(3500000);
    expect(listing.price_per_m2).toBe(53846);
    expect(listing.monthly_fee).toBe(4200);
    expect(listing.operating_cost).toBe(1200);

    // Estimates
    expect(listing.booli_estimate_low).toBe(3200000);
    expect(listing.booli_estimate_mid).toBe(3500000);
    expect(listing.booli_estimate_high).toBe(3800000);

    // Amenities
    expect(listing.has_balcony).toBe(true);
    expect(listing.has_patio).toBe(false);
    expect(listing.has_elevator).toBe(true);
    expect(listing.has_fireplace).toBe(false);
    expect(listing.has_storage).toBe(false);

    // Dates
    expect(listing.published_date).toBe("2026-04-01");
    expect(listing.showing_date).toBe("2026-04-20");

    // scraped_at is a non-empty ISO 8601 string
    expect(typeof listing.scraped_at).toBe("string");
    expect(listing.scraped_at.length).toBeGreaterThan(0);
    expect(() => new Date(listing.scraped_at)).not.toThrow();
    expect(new Date(listing.scraped_at).toISOString()).toBe(listing.scraped_at);
  });

  test("returns null for missing optional fields when only address and listPrice are present", async () => {
    const fetchPage = async (_url: string): Promise<string> => minimalHtml;

    const result = await scrapeDetailPage(fetchPage, "/bostad/111111");

    expect(result).not.toBeNull();
    const listing = result as NewListing;

    // Present fields
    expect(listing.address).toBe("Minimal Street 1");
    expect(listing.list_price).toBe(2000000);

    // All other string/number fields should be null
    expect(listing.neighbourhood).toBeNull();
    expect(listing.municipality).toBeNull();
    expect(listing.postal_code).toBeNull();
    expect(listing.brf_name).toBeNull();
    expect(listing.living_area_m2).toBeNull();
    expect(listing.rooms).toBeNull();
    expect(listing.floor).toBeNull();
    expect(listing.total_floors).toBeNull();
    expect(listing.construction_year).toBeNull();
    expect(listing.price_per_m2).toBeNull();
    expect(listing.monthly_fee).toBeNull();
    expect(listing.operating_cost).toBeNull();
    expect(listing.booli_estimate_low).toBeNull();
    expect(listing.booli_estimate_mid).toBeNull();
    expect(listing.booli_estimate_high).toBeNull();
    expect(listing.published_date).toBeNull();
    expect(listing.showing_date).toBeNull();

    // Boolean amenities should be false
    expect(listing.has_balcony).toBe(false);
    expect(listing.has_patio).toBe(false);
    expect(listing.has_elevator).toBe(false);
    expect(listing.has_fireplace).toBe(false);
    expect(listing.has_storage).toBe(false);
  });

  test("parses booli_id and listing_type from href /annons/654321", async () => {
    const fetchPage = async (_url: string): Promise<string> => minimalHtml;

    const result = await scrapeDetailPage(fetchPage, "/annons/654321");

    expect(result).not.toBeNull();
    const listing = result as NewListing;

    expect(listing.booli_id).toBe(654321);
    expect(listing.listing_type).toBe("annons");
    expect(listing.url).toBe("https://www.booli.se/annons/654321");
  });

  test("retries once on failure then returns null and logs error", async () => {
    let callCount = 0;
    const fetchPage = async (_url: string): Promise<string> => {
      callCount++;
      throw new Error("Network error");
    };

    const consoleError = spyOn(console, "error").mockImplementation(() => {});

    const result = await scrapeDetailPage(fetchPage, "/bostad/999999");

    expect(result).toBeNull();
    expect(callCount).toBe(2);
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  test("returns listing when fetchPage fails on first call but succeeds on second", async () => {
    let callCount = 0;
    const fetchPage = async (_url: string): Promise<string> => {
      callCount++;
      if (callCount === 1) {
        throw new Error("Transient error");
      }
      return fixtureHtml;
    };

    const result = await scrapeDetailPage(fetchPage, "/bostad/789456");

    expect(result).not.toBeNull();
    expect(callCount).toBe(2);
    const listing = result as NewListing;
    expect(listing.booli_id).toBe(789456);
    expect(listing.listing_type).toBe("bostad");
  });
});
