const calls: string[] = [];

// Intercept via env — called by pipeline sequence check fixture
const scraper = { runScraper: async () => { calls.push("scraper"); } };
const scoring = { runScoring: () => { calls.push("scoring"); } };
const agent = { runAnalysis: async () => { calls.push("agent"); return [1]; } };
const notifier = { runNotifier: async () => { calls.push("notifier"); } };

// Simulate the pipeline sequence
const db = {} as any;
const searchConfig = {} as any;
const analysisConfig = { scoreThreshold: 70, maxSteps: 20 };

await scraper.runScraper(db, searchConfig);
scoring.runScoring(db);
const analysedIds = await agent.runAnalysis(db, analysisConfig);
await notifier.runNotifier(db, analysedIds);

console.log(JSON.stringify(calls));
