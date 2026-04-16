import type { Database } from "bun:sqlite";
import { ScoreSchema, NewScoreSchema } from "./schemas";
import type { Score, NewScore } from "./schemas";

export function insertScore(db: Database, data: NewScore): number {
  const validated = NewScoreSchema.parse(data);

  const result = db.run(
    `INSERT INTO scores (listing_id, total_score, rule_breakdown, scored_at)
     VALUES (?, ?, ?, ?)`,
    [validated.listing_id, validated.total_score, validated.rule_breakdown, validated.scored_at]
  );

  return Number(result.lastInsertRowid);
}

export function getScoreByListingId(db: Database, listingId: number): Score | null {
  const row = db
    .query<Record<string, unknown>, [number]>(
      "SELECT * FROM scores WHERE listing_id = ? ORDER BY scored_at DESC LIMIT 1"
    )
    .get(listingId);

  if (!row) return null;
  return ScoreSchema.parse(row);
}
