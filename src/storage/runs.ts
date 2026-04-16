import type { Database } from "bun:sqlite";

export function insertRun(db: Database, data: { started_at: string }): number {
  const result = db.run(
    `INSERT INTO runs (started_at, completed_at, listings_scraped, listings_scored, listings_analysed, email_sent)
     VALUES (?, NULL, 0, 0, 0, 0)`,
    [data.started_at]
  );
  return Number(result.lastInsertRowid);
}

export function updateRun(
  db: Database,
  id: number,
  data: {
    completed_at: string;
    listings_scraped: number;
    listings_scored: number;
    listings_analysed: number;
    email_sent: boolean;
  }
): void {
  db.run(
    `UPDATE runs
     SET completed_at = ?, listings_scraped = ?, listings_scored = ?, listings_analysed = ?, email_sent = ?
     WHERE id = ?`,
    [data.completed_at, data.listings_scraped, data.listings_scored, data.listings_analysed, data.email_sent ? 1 : 0, id]
  );
}
