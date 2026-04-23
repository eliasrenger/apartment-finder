import { S3Client } from "bun";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const {
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_ACCOUNT_ID,
  R2_BUCKET = "apartment-finder",
} = process.env;

const R2_KEY = "data/listings.db";

export const DB_PATH = new URL("./data/listings.db", import.meta.url).pathname;

function createDefaultClient(): S3Client {
  return new S3Client({
    accessKeyId: R2_ACCESS_KEY_ID!,
    secretAccessKey: R2_SECRET_ACCESS_KEY!,
    endpoint: `https://${R2_ACCOUNT_ID}.eu.r2.cloudflarestorage.com`,
    bucket: R2_BUCKET,
    region: "auto",
  });
}

async function download(dbPath: string, client: S3Client): Promise<void> {
  await mkdir(dirname(dbPath), { recursive: true });
  const buffer = await client.file(R2_KEY).arrayBuffer();
  await Bun.write(dbPath, buffer);
}

export async function fetchDbIfMissing(
  dbPath = DB_PATH,
  client?: S3Client,
): Promise<void> {
  if (existsSync(dbPath)) return;
  try {
    await download(dbPath, client ?? createDefaultClient());
  } catch (err: any) {
    if (err?.code === "NoSuchKey") {
      console.warn("No DB found in R2 yet — pipeline has not run. Starting with empty data.");
      return;
    }
    throw err;
  }
}

export async function forceRefresh(
  dbPath = DB_PATH,
  client?: S3Client,
): Promise<void> {
  await download(dbPath, client ?? createDefaultClient());
}
