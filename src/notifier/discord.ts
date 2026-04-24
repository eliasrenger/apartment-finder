import type { Database } from "bun:sqlite";

interface NotifiableListing {
  id: number;
  address: string | null;
  url: string;
  total_score: number;
  result: string;
}

function getNotifiableListings(db: Database, listingIds: number[]): NotifiableListing[] {
  if (listingIds.length === 0) return [];
  const placeholders = listingIds.map(() => "?").join(",");
  return db
    .query<NotifiableListing, number[]>(
      `SELECT l.id, l.address, l.url, s.total_score, a.result
       FROM listings l
       JOIN scores s ON s.listing_id = l.id
       JOIN analyses a ON a.listing_id = l.id
       WHERE l.id IN (${placeholders})`
    )
    .all(...listingIds);
}

export async function runNotifier(db: Database, listingIds: number[]): Promise<void> {
  const webhook = process.env.DISCORD_WEBHOOK;
  if (!webhook) {
    console.log(
      JSON.stringify({ level: "warn", message: "DISCORD_WEBHOOK not set, skipping notifications", ts: new Date().toISOString() })
    );
    return;
  }

  if (listingIds.length === 0) return;

  const listings = getNotifiableListings(db, listingIds);

  for (const listing of listings) {
    const parsed = JSON.parse(listing.result) as { notifyUser: boolean; explanation: string };
    if (!parsed.notifyUser) continue;

    const address = listing.address ?? "Unknown address";
    const payload = {
      embeds: [
        {
          title: `🏠 ${address}`,
          description: parsed.explanation,
          fields: [
            { name: "Score", value: `${listing.total_score}/100`, inline: true },
            { name: "Link", value: listing.url, inline: false },
          ],
          color: 0x2ecc71,
        },
      ],
    };

    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }
}
