import { z } from "zod";

export const LISTING_TYPES = ["bostad", "annons"] as const;
export type ListingType = (typeof LISTING_TYPES)[number];

export const ListingSchema = z.object({
  id: z.number().int(),
  booli_id: z.number().int(),
  listing_type: z.enum(LISTING_TYPES),
  url: z.string(),
  published_date: z.string().nullable(),
  scraped_at: z.string(),
  address: z.string().nullable(),
  neighbourhood: z.string().nullable(),
  municipality: z.string().nullable(),
  postal_code: z.string().nullable(),
  brf_name: z.string().nullable(),
  living_area_m2: z.number().nullable(),
  rooms: z.number().nullable(),
  floor: z.number().int().nullable(),
  total_floors: z.number().int().nullable(),
  construction_year: z.number().int().nullable(),
  list_price: z.number().int().nullable(),
  price_per_m2: z.number().int().nullable(),
  monthly_fee: z.number().int().nullable(),
  operating_cost: z.number().int().nullable(),
  booli_estimate_low: z.number().int().nullable(),
  booli_estimate_mid: z.number().int().nullable(),
  booli_estimate_high: z.number().int().nullable(),
  has_balcony: z.coerce.boolean(),
  has_patio: z.coerce.boolean(),
  has_elevator: z.coerce.boolean(),
  has_fireplace: z.coerce.boolean(),
  has_storage: z.coerce.boolean(),
  showing_date: z.string().nullable(),
});

export type Listing = z.infer<typeof ListingSchema>;

export const NewListingSchema = ListingSchema.omit({ id: true }).strict();
export type NewListing = z.infer<typeof NewListingSchema>;

export const ScoreSchema = z.object({
  id: z.number().int(),
  listing_id: z.number().int(),
  total_score: z.number().int(),
  rule_breakdown: z.string(),
  scored_at: z.string(),
});

export type Score = z.infer<typeof ScoreSchema>;

export const NewScoreSchema = ScoreSchema.omit({ id: true });
export type NewScore = z.infer<typeof NewScoreSchema>;

export const AnalysisSchema = z.object({
  id: z.number().int(),
  listing_id: z.number().int(),
  result: z.string(),
  analysed_at: z.string(),
});

export type Analysis = z.infer<typeof AnalysisSchema>;

export const NewAnalysisSchema = AnalysisSchema.omit({ id: true });
export type NewAnalysis = z.infer<typeof NewAnalysisSchema>;

export const RunSchema = z.object({
  id: z.number().int(),
  started_at: z.string(),
  completed_at: z.string().nullable(),
  listings_scraped: z.number().int(),
  listings_scored: z.number().int(),
  listings_analysed: z.number().int(),
  email_sent: z.coerce.boolean(),
});

export type Run = z.infer<typeof RunSchema>;

export const NewRunSchema = RunSchema.omit({ id: true });
export type NewRun = z.infer<typeof NewRunSchema>;
