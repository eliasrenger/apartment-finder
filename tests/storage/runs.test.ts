import { describe, expect, test, beforeEach } from "bun:test";
import type { Database } from "bun:sqlite";
import { initDatabase } from "../../src/storage/db";
import { insertRun, updateRun } from "../../src/storage/runs";

let db: Database;

beforeEach(() => {
  db = initDatabase(":memory:");
});

describe("insertRun", () => {
  test("creates a run row and returns its generated id", () => {
    const id = insertRun(db, { started_at: "2026-04-13T06:00:00.000Z" });
    expect(id).toBeGreaterThan(0);
  });

  test("new run has null completed_at and zero counts", () => {
    const id = insertRun(db, { started_at: "2026-04-13T06:00:00.000Z" });
    const row = db.query<{ completed_at: string | null; listings_scraped: number; email_sent: number }, [number]>(
      "SELECT completed_at, listings_scraped, email_sent FROM runs WHERE id = ?"
    ).get(id)!;

    expect(row.completed_at).toBeNull();
    expect(row.listings_scraped).toBe(0);
    expect(row.email_sent).toBe(0);
  });
});

describe("updateRun", () => {
  test("updates completed_at, counts, and email_sent", () => {
    const id = insertRun(db, { started_at: "2026-04-13T06:00:00.000Z" });

    updateRun(db, id, {
      completed_at: "2026-04-13T06:05:00.000Z",
      listings_scraped: 42,
      listings_scored: 10,
      listings_analysed: 3,
      email_sent: true,
    });

    const row = db.query<{
      completed_at: string;
      listings_scraped: number;
      listings_scored: number;
      listings_analysed: number;
      email_sent: number;
    }, [number]>("SELECT completed_at, listings_scraped, listings_scored, listings_analysed, email_sent FROM runs WHERE id = ?").get(id)!;

    expect(row.completed_at).toBe("2026-04-13T06:05:00.000Z");
    expect(row.listings_scraped).toBe(42);
    expect(row.listings_scored).toBe(10);
    expect(row.listings_analysed).toBe(3);
    expect(row.email_sent).toBe(1);
  });

  test("email_sent false is stored as 0", () => {
    const id = insertRun(db, { started_at: "2026-04-13T06:00:00.000Z" });
    updateRun(db, id, {
      completed_at: "2026-04-13T06:05:00.000Z",
      listings_scraped: 0,
      listings_scored: 0,
      listings_analysed: 0,
      email_sent: false,
    });
    const row = db.query<{ email_sent: number }, [number]>("SELECT email_sent FROM runs WHERE id = ?").get(id)!;
    expect(row.email_sent).toBe(0);
  });
});
