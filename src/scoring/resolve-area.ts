import {
  DISTRICT_PRICES,
  NEIGHBOURHOOD_ALIASES,
  POSTAL_PREFIX_DISTRICTS,
  MUNICIPALITY_PRICES,
} from "./area-prices";

/**
 * Resolves a listing's location to an average price per m² (SEK) using a
 * three-tier static fallback:
 *   1. Direct neighbourhood / district match
 *   2. Neighbourhood alias → parent district
 *   3. Postal code prefix → district
 *   4. Municipality fallback
 *
 * Returns null if all tiers fail to produce a match.
 */
export function resolveAreaPrice(
  neighbourhood: string | null,
  postalCode: string | null,
  municipality: string | null
): number | null {
  // Tier 1: direct district match or alias
  if (neighbourhood) {
    const name = neighbourhood.trim();
    if (DISTRICT_PRICES[name] !== undefined) return DISTRICT_PRICES[name]!;
    const parent = NEIGHBOURHOOD_ALIASES[name];
    if (parent && DISTRICT_PRICES[parent] !== undefined) return DISTRICT_PRICES[parent]!;
  }

  // Tier 2: postal code prefix
  if (postalCode) {
    const digits = postalCode.replace(/\s/g, "");
    const prefix = digits.slice(0, 3);
    const district = POSTAL_PREFIX_DISTRICTS[prefix];
    if (district && DISTRICT_PRICES[district] !== undefined) return DISTRICT_PRICES[district]!;
  }

  // Tier 3: municipality fallback
  if (municipality) {
    const price = MUNICIPALITY_PRICES[municipality.trim()];
    if (price !== undefined) return price;
  }

  return null;
}
