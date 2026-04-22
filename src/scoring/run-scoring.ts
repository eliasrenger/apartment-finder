import type { Database } from "bun:sqlite";
import { ListingSchema } from "../storage/schemas";
import { scoreListing } from "./score-listing";

/**
 * Scores all listings in the DB that do not yet have a corresponding row in
 * the `scores` table. Listings already scored are left untouched — this
 * function is safe to call multiple times.
 */
export function runScoring(db: Database): void {
  const rows = db
    .query<Record<string, unknown>, []>(
      `SELECT l.* FROM listings l
       WHERE NOT EXISTS (
         SELECT 1 FROM scores s WHERE s.listing_id = l.id
       )`
    )
    .all();

  const insert = db.prepare(
    `INSERT INTO scores (listing_id, total_score, rule_breakdown, scored_at)
     VALUES (?, ?, ?, ?)`
  );

  for (const row of rows) {
    const listing = ListingSchema.parse(row);
    const { total_score, rule_breakdown } = scoreListing(listing);

    insert.run(
      listing.id,
      total_score,
      JSON.stringify(rule_breakdown),
      new Date().toISOString()
    );
  }
}
