import type { Listing } from "../storage/schemas";
import { resolveAreaPrice } from "./resolve-area";

/** Clamp a value between min and max. */
function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/** Round to the nearest integer, clamped to [0, maxPts]. */
function pts(raw: number, maxPts: number): number {
  return clamp(Math.round(raw), 0, maxPts);
}

// ─── area_value (max 20) ─────────────────────────────────────────────────────

/**
 * Converts a resolved area price (SEK/m²) into a tier score 0–20.
 *   Tier 1 (≥100 000) → 20
 *   Tier 2 (≥80 000)  → 15
 *   Tier 3 (≥60 000)  → 10
 *   Tier 4 (≥45 000)  → 5
 *   Tier 5 (<45 000)  → 0
 */
function priceToAreaPoints(pricePerM2: number): number {
  if (pricePerM2 >= 100_000) return 20;
  if (pricePerM2 >= 80_000) return 15;
  if (pricePerM2 >= 60_000) return 10;
  if (pricePerM2 >= 45_000) return 5;
  return 0;
}

export function areaValueRule(listing: Listing): number {
  const price = resolveAreaPrice(
    listing.neighbourhood,
    listing.postal_code,
    listing.municipality
  );
  if (price === null) return 0;
  return priceToAreaPoints(price);
}

// ─── deal_quality (max 18) ───────────────────────────────────────────────────

/**
 * Compares list_price/m² vs area average (9 pts) and vs Booli estimate (9 pts).
 * Each component is independently null-safe.
 */
export function dealQualityRule(listing: Listing): number {
  const { list_price, living_area_m2, booli_estimate_mid } = listing;
  if (!list_price || !living_area_m2) return 0;

  const listPricePerM2 = list_price / living_area_m2;
  let total = 0;

  // Area comparison component (max 9)
  const areaPrice = resolveAreaPrice(
    listing.neighbourhood,
    listing.postal_code,
    listing.municipality
  );
  if (areaPrice !== null) {
    const ratio = listPricePerM2 / areaPrice;
    // ratio < 0.85 → 9, 0.85–1.15 → linear, > 1.15 → 0
    const areaScore = ratio >= 1.15 ? 0 : 9 * clamp((1.15 - ratio) / 0.30, 0, 1);
    total += pts(areaScore, 9);
  }

  // Booli estimate component (max 9)
  if (booli_estimate_mid !== null) {
    const ratio = list_price / booli_estimate_mid;
    // ratio < 0.90 → 9, 0.90–1.10 → linear, > 1.10 → 0
    const booliScore = ratio >= 1.1 ? 0 : 9 * clamp((1.1 - ratio) / 0.20, 0, 1);
    total += pts(booliScore, 9);
  }

  return clamp(total, 0, 18);
}

// ─── fee_per_m2 (max 15) ─────────────────────────────────────────────────────

/**
 * Lower monthly fee per m² scores higher.
 *   ≤42 SEK/m²/month → 15 pts
 *   ≥100 SEK/m²/month → 0 pts
 *   Linear in between.
 */
export function feePerM2Rule(listing: Listing): number {
  const { monthly_fee, living_area_m2 } = listing;
  if (monthly_fee === null || living_area_m2 === null || living_area_m2 === 0) return 0;

  const feePerM2 = monthly_fee / living_area_m2;
  const LOW = 42;
  const HIGH = 100;

  if (feePerM2 <= LOW) return 15;
  if (feePerM2 >= HIGH) return 0;
  return pts(15 * (HIGH - feePerM2) / (HIGH - LOW), 15);
}

// ─── size_and_rooms (max 12) ─────────────────────────────────────────────────

/** Size sweet spot: 50–80 m² → 7, drops outside that. Null → 0. */
function sizePoints(m2: number): number {
  if (m2 >= 50 && m2 <= 80) return 7;
  if ((m2 >= 35 && m2 < 50) || (m2 > 80 && m2 <= 110)) return 5;
  if ((m2 >= 25 && m2 < 35) || (m2 > 110 && m2 <= 140)) return 3;
  return 1;
}

/** Room sweet spot: 2–3 rooms → 5. */
function roomPoints(rooms: number): number {
  if (rooms === 2 || rooms === 3) return 5;
  if (rooms === 4) return 4;
  if (rooms === 1) return 2;
  return 3; // 5+ rooms
}

export function sizeAndRoomsRule(listing: Listing): number {
  const { living_area_m2, rooms } = listing;
  if (living_area_m2 === null) return 0;

  const size = sizePoints(living_area_m2);
  const room = rooms !== null ? roomPoints(rooms) : 0;
  return clamp(size + room, 0, 12);
}

// ─── floor_and_elevator (max 9) ──────────────────────────────────────────────

export function floorAndElevatorRule(listing: Listing): number {
  const { floor, has_elevator } = listing;
  if (floor === null) return 0;

  if (floor >= 4) return has_elevator ? 9 : 0;
  if (floor >= 2) return has_elevator ? 7 : 5;
  return 1; // ground floor
}

// ─── balcony_or_patio (max 9) ────────────────────────────────────────────────

export function balconyOrPatioRule(listing: Listing): number {
  if (listing.has_balcony) return 9;
  if (listing.has_patio) return 6;
  return 0;
}

// ─── construction_era (max 7) ────────────────────────────────────────────────

export function constructionEraRule(listing: Listing): number {
  const { construction_year } = listing;
  if (construction_year === null) return 0;

  if (construction_year < 1930) return 7;
  if (construction_year <= 1959) return 5;
  if (construction_year <= 1979) return 2;
  if (construction_year <= 1999) return 4;
  return 6; // 2000+
}

// ─── booli_estimate_confidence (max 5) ───────────────────────────────────────

/**
 * Uses (high - low) / mid as the uncertainty proxy.
 * Narrower range → higher confidence → more points.
 */
export function booliEstimateConfidenceRule(listing: Listing): number {
  const { booli_estimate_low, booli_estimate_mid, booli_estimate_high } = listing;
  if (
    booli_estimate_mid === null ||
    booli_estimate_low === null ||
    booli_estimate_high === null ||
    booli_estimate_mid === 0
  ) {
    return 0;
  }

  const spread = (booli_estimate_high - booli_estimate_low) / booli_estimate_mid;
  // spread < 0.05 → 5, spread > 0.30 → 0, linear in between
  if (spread <= 0.05) return 5;
  if (spread >= 0.30) return 0;
  return pts(5 * (0.30 - spread) / 0.25, 5);
}

// ─── fireplace (max 3) ───────────────────────────────────────────────────────

export function firepaceRule(listing: Listing): number {
  return listing.has_fireplace ? 3 : 0;
}

// ─── storage (max 2) ─────────────────────────────────────────────────────────

export function storageRule(listing: Listing): number {
  return listing.has_storage ? 2 : 0;
}
