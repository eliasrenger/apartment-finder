import type { Database } from "bun:sqlite";
import { ListingSchema, NewListingSchema } from "./schemas";
import type { Listing, NewListing } from "./schemas";

export function insertListing(db: Database, data: NewListing): number | null {
  const validated = NewListingSchema.parse(data);

  const result = db.run(
    `INSERT OR IGNORE INTO listings (
      booli_id, listing_type, url, published_date, scraped_at,
      address, neighbourhood, municipality, postal_code, brf_name,
      living_area_m2, rooms, floor, total_floors, construction_year,
      list_price, price_per_m2, monthly_fee, operating_cost,
      booli_estimate_low, booli_estimate_mid, booli_estimate_high,
      has_balcony, has_patio, has_elevator, has_fireplace, has_storage,
      showing_date
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?
    )`,
    [
      validated.booli_id,
      validated.listing_type,
      validated.url,
      validated.published_date,
      validated.scraped_at,
      validated.address,
      validated.neighbourhood,
      validated.municipality,
      validated.postal_code,
      validated.brf_name,
      validated.living_area_m2,
      validated.rooms,
      validated.floor,
      validated.total_floors,
      validated.construction_year,
      validated.list_price,
      validated.price_per_m2,
      validated.monthly_fee,
      validated.operating_cost,
      validated.booli_estimate_low,
      validated.booli_estimate_mid,
      validated.booli_estimate_high,
      validated.has_balcony ? 1 : 0,
      validated.has_patio ? 1 : 0,
      validated.has_elevator ? 1 : 0,
      validated.has_fireplace ? 1 : 0,
      validated.has_storage ? 1 : 0,
      validated.showing_date,
    ]
  );

  if (result.changes === 0) return null;
  return Number(result.lastInsertRowid);
}

export function getListingById(db: Database, id: number): Listing | null {
  const row = db.query<Record<string, unknown>, [number]>("SELECT * FROM listings WHERE id = ?").get(id);
  if (!row) return null;
  return ListingSchema.parse(row);
}

export function getListingsSince(db: Database, since: string): Listing[] {
  const rows = db
    .query<Record<string, unknown>, [string]>("SELECT * FROM listings WHERE scraped_at >= ?")
    .all(since);
  return rows.map((row) => ListingSchema.parse(row));
}
