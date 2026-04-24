## 1. Dependencies & config

- [x] 1.1 Install `@mastra/core` and a PDF extraction library; verify both work on Bun
- [x] 1.2 Write tests for the `analysis` config block — covers: valid block loads with correct types, missing block returns defaults, invalid scoreThreshold throws
- [x] 1.3 Extend `src/config/` Zod schema with `analysis: { scoreThreshold, maxSteps }`; add `analysis` block to `config.yaml` with defaults; run tests green

## 2. Agent tools

- [x] 2.1 Write tests for `browsePage` — covers: returns text and links from a mocked page, truncates at character limit
- [x] 2.2 Implement `src/agent/tools/browse-page.ts` — Playwright, extracts `innerText` + links, caps at 15 000 chars; browser injected via closure; run tests green
- [x] 2.3 Write tests for `readPdf` — covers: extracts text from a PDF buffer, truncates at character limit
- [x] 2.4 Implement `src/agent/tools/read-pdf.ts` — fetches URL, extracts text, caps at 20 000 chars; run tests green
- [x] 2.5 Write tests for `googleSearch` — covers: returns results array with url/title/snippet, handles empty results
- [x] 2.6 Implement `src/agent/tools/google-search.ts` — fetches search results, returns top results; run tests green

## 3. Mastra agent

- [x] 3.1 Implement `src/agent/agent.ts` — Mastra `Agent` with `claude-sonnet-4-6`, all three tools, and system prompt covering: browsing strategy (booli → BRF → annual report → Google fallback), what to extract (equity ratio, debt/sqm, fee trend, pending renovations, operating surplus, loan renegotiation dates, lifestyle factors), verdict logic, and required JSON output format `{ notifyUser, explanation }`

## 4. Analysis runner

- [x] 4.1 Write tests for `runAnalysis` — covers: skips listings below threshold, skips already-analysed listings, inserts analysis result for eligible listing (agent mocked)
- [x] 4.2 Implement `src/agent/index.ts` — `runAnalysis(db, config)`: launches shared browser, queries eligible listings, runs agent per listing, parses JSON result, writes to `analyses` table, closes browser; run tests green

## 5. Discord notifier

- [x] 5.1 Write tests for `sendDiscordNotifications` — covers: sends one message per notifyUser listing, skips listings with notifyUser false, handles missing DISCORD_WEBHOOK gracefully
- [x] 5.2 Implement `src/notifier/discord.ts` — reads analyses joined with listings from current run, POSTs one embed per `notifyUser: true` listing (address, score, explanation, booli URL); run tests green

## 6. Pipeline wiring

- [x] 6.1 Write tests for the full pipeline sequence in `src/index.ts` — covers: `runAnalysis` called after `runScoring`, `runNotifier` called after `runAnalysis` (all mocked)
- [x] 6.2 Update `src/index.ts` to call `runAnalysis(db, config)` then `runNotifier(db)` after `runScoring(db)`; run tests green
