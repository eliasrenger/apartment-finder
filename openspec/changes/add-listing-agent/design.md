## Context

The pipeline currently ends after scoring. The `analyses` table already exists in the storage schema but is never written to. The `ANTHROPIC_API_KEY` is already available. Playwright is already installed for scraping. This change wires everything together with a Mastra agent loop.

## Goals / Non-Goals

**Goals:**
- Agent analyses each unanalysed listing scoring ≥ threshold, writes `{ notifyUser, explanation }` to `analyses`
- Discord notification sent per `notifyUser: true` listing after all analyses complete
- Score threshold and max agent steps configurable without code changes

**Non-Goals:**
- No retry logic — one attempt per listing per run
- No streaming — `agent.generate()` only
- No auth on external sites
- No changes to scraper, scoring, or storage schema

## Decisions

### Mastra + `claude-sonnet-4-6`
Mastra is TypeScript-first, Bun-compatible, and has native Anthropic support. The agent loop (tool dispatch → result → next step) is handled by Mastra — no manual loop needed. Model string: `"anthropic/claude-sonnet-4-6"`.

### Shared Playwright browser per `runAnalysis()` call
Opening a browser is expensive (~1–2s). All tool calls within one analysis share a single browser instance. The browser is launched before the first listing and closed after the last. Tools receive the browser via a closure or context parameter — not as a Mastra tool parameter (the agent should not control browser lifecycle).

**Alternative considered:** one browser per tool call — rejected for cost and latency.

### Three tools
| Tool | Input | Output |
|---|---|---|
| `browsePage` | `url: string` | `{ text: string, links: { href, label }[] }` |
| `readPdf` | `url: string` | `{ text: string }` |
| `googleSearch` | `query: string` | `{ results: { url, title, snippet }[] }` |

`browsePage` uses Playwright (already installed). `readPdf` fetches the PDF and extracts text. `googleSearch` uses a lightweight fetch against Google's search page or a free API — implementation detail to be settled at code time.

### Tool output truncation
Raw page HTML can be hundreds of KB. `browsePage` returns extracted text only (via `page.evaluate(() => document.body.innerText)`), capped at ~15 000 characters. `readPdf` capped at ~20 000 characters. This keeps the agent context manageable without semantic chunking.

**Alternative considered:** full HTML — rejected because it bloats the context window and confuses the model with markup.

### Agent instructions bake in the research strategy
The system prompt tells the agent the exact browsing strategy: booli page first, find BRF link, navigate to BRF site, find annual report PDF, extract key figures. Google search is the fallback. This produces consistent behaviour without hardcoding rules in application code.

### Verdict stored as JSON string in `analyses.result`
`{ "notifyUser": boolean, "explanation": string }` — parsed by the notifier and the viewer. The column is already `TEXT`; no schema migration needed. The agent is instructed to always respond with valid JSON in this shape.

### Notifier runs after all analyses complete
`runNotifier(db)` reads all `notifyUser: true` analyses from the current run and sends one Discord message per listing. Batching after all analyses avoids partial notifications if the pipeline crashes mid-run.

**Alternative considered:** notify immediately after each analysis — rejected because a mid-run crash would send some notifications but not others, with no way to know which.

### `maxSteps` cap in config
Prevents runaway agent loops. Default 20. Each tool call = 1 step.

## Risks / Trade-offs

- **BRF sites vary wildly** → Mitigated by giving the agent flexibility (it decides what links to follow). Partial data is acceptable per spec.
- **Context window growth** → Mitigated by text-only extraction with character caps.
- **Google search scraping** → May need to switch to a paid API if Google blocks. Treat as implementation detail.
- **Agent cost per listing** → Each analysis may use 20k–80k tokens. With many top listings, cost adds up. `scoreThreshold` lets the user control the blast radius.
- **PDF extraction Bun compatibility** → `pdf-parse` uses Node.js Buffer APIs, should work on Bun. To be verified at implementation time.
