import { initDatabase } from "./storage/db";
import { loadSearchConfig, loadAnalysisConfig } from "./config/search-config";
import { runScraper } from "./scraper/index";
import { runScoring } from "./scoring/index";
import { runAnalysis } from "./agent/index";
import { runNotifier } from "./notifier/discord";

async function run(): Promise<void> {
  const searchConfig = loadSearchConfig("config.yaml");
  const analysisConfig = loadAnalysisConfig("config.yaml");
  const db = initDatabase("data/listings.db");
  await runScraper(db, searchConfig);
  runScoring(db);
  const analysedIds = await runAnalysis(db, analysisConfig);
  await runNotifier(db, analysedIds);
}

run()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.log(JSON.stringify({ level: "error", message: "Pipeline failed", err: String(err), ts: new Date().toISOString() }));
    process.exit(1);
  });
