import { initDatabase } from "./storage/db";
import { loadSearchConfig } from "./config/search-config";
import { runScraper } from "./scraper/index";

async function run(): Promise<void> {
  const config = loadSearchConfig("config.yaml");
  const db = initDatabase("data/listings.db");
  await runScraper(db, config);
}

run()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.log(JSON.stringify({ level: "error", message: "Pipeline failed", err: String(err), ts: new Date().toISOString() }));
    process.exit(1);
  });
