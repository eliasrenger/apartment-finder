import type { Listing } from "../storage/schemas";
import {
  areaValueRule,
  dealQualityRule,
  feePerM2Rule,
  sizeAndRoomsRule,
  floorAndElevatorRule,
  balconyOrPatioRule,
  constructionEraRule,
  booliEstimateConfidenceRule,
  firepaceRule,
  storageRule,
} from "./rules";

export interface ScoreResult {
  total_score: number;
  rule_breakdown: Record<string, number>;
}

/**
 * Scores a listing on a 0–100 integer scale by summing all rule contributions.
 * Every rule is null-safe: missing fields contribute 0.
 */
export function scoreListing(listing: Listing): ScoreResult {
  const rule_breakdown: Record<string, number> = {
    area_value: areaValueRule(listing),
    deal_quality: dealQualityRule(listing),
    fee_per_m2: feePerM2Rule(listing),
    size_and_rooms: sizeAndRoomsRule(listing),
    floor_and_elevator: floorAndElevatorRule(listing),
    balcony_or_patio: balconyOrPatioRule(listing),
    construction_era: constructionEraRule(listing),
    booli_estimate_confidence: booliEstimateConfidenceRule(listing),
    fireplace: firepaceRule(listing),
    storage: storageRule(listing),
  };

  const total_score = Math.min(
    100,
    Object.values(rule_breakdown).reduce((sum, v) => sum + (v ?? 0), 0)
  );

  return { total_score, rule_breakdown };
}
