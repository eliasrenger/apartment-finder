import type { Database } from "bun:sqlite";
import { existsSync, statSync } from "node:fs";

export interface LastRun {
  id: number;
  started_at: string;
  completed_at: string | null;
  listings_scraped: number;
  listings_scored: number;
  listings_analysed: number;
}

export interface ListingRow {
  id: number;
  url: string;
  address: string | null;
  neighbourhood: string | null;
  rooms: number | null;
  living_area_m2: number | null;
  list_price: number | null;
  monthly_fee: number | null;
  total_score: number | null;
}

export interface ListingDetail {
  id: number;
  booli_id: number;
  listing_type: string;
  url: string;
  published_date: string | null;
  address: string | null;
  neighbourhood: string | null;
  municipality: string | null;
  postal_code: string | null;
  brf_name: string | null;
  living_area_m2: number | null;
  rooms: number | null;
  floor: number | null;
  total_floors: number | null;
  construction_year: number | null;
  list_price: number | null;
  price_per_m2: number | null;
  monthly_fee: number | null;
  operating_cost: number | null;
  has_balcony: boolean;
  has_patio: boolean;
  has_elevator: boolean;
  has_fireplace: boolean;
  has_storage: boolean;
  showing_date: string | null;
  total_score: number | null;
  rule_breakdown: Record<string, number> | null;
  analysis: string | null;
}

export interface DbInfo {
  lastModified: string | null;
}

export function getLastRun(db: Database): LastRun | null {
  return (
    db
      .query<LastRun, []>("SELECT * FROM runs ORDER BY id DESC LIMIT 1")
      .get() ?? null
  );
}

export function getListings(db: Database): ListingRow[] {
  return db
    .query<ListingRow, []>(
      `SELECT l.id, l.url, l.address, l.neighbourhood, l.rooms,
              l.living_area_m2, l.list_price, l.monthly_fee, s.total_score
       FROM listings l
       LEFT JOIN scores s ON s.listing_id = l.id
       ORDER BY s.total_score DESC`
    )
    .all();
}

export function getListingById(db: Database, id: number): ListingDetail | null {
  const row = db
    .query<Record<string, unknown>, [number]>(
      `SELECT l.*, s.total_score, s.rule_breakdown, a.result AS analysis
       FROM listings l
       LEFT JOIN scores s ON s.listing_id = l.id
       LEFT JOIN analyses a ON a.listing_id = l.id
       WHERE l.id = ?`
    )
    .get(id);

  if (!row) return null;

  return {
    ...(row as any),
    rule_breakdown: row.rule_breakdown
      ? JSON.parse(row.rule_breakdown as string)
      : null,
    has_balcony: Boolean(row.has_balcony),
    has_patio: Boolean(row.has_patio),
    has_elevator: Boolean(row.has_elevator),
    has_fireplace: Boolean(row.has_fireplace),
    has_storage: Boolean(row.has_storage),
  };
}

export function getDbInfo(dbPath: string): DbInfo {
  if (!existsSync(dbPath)) return { lastModified: null };
  return { lastModified: statSync(dbPath).mtime.toISOString() };
}
