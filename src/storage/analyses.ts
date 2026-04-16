import type { Database } from "bun:sqlite";
import { AnalysisSchema, NewAnalysisSchema } from "./schemas";
import type { Analysis, NewAnalysis } from "./schemas";

export function insertAnalysis(db: Database, data: NewAnalysis): number {
  const validated = NewAnalysisSchema.parse(data);

  const result = db.run(
    `INSERT INTO analyses (listing_id, result, analysed_at) VALUES (?, ?, ?)`,
    [validated.listing_id, validated.result, validated.analysed_at]
  );

  return Number(result.lastInsertRowid);
}

export function getAnalysisByListingId(db: Database, listingId: number): Analysis | null {
  const row = db
    .query<Record<string, unknown>, [number]>("SELECT * FROM analyses WHERE listing_id = ?")
    .get(listingId);

  if (!row) return null;
  return AnalysisSchema.parse(row);
}
