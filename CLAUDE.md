# CLAUDE.md

## Project Overview

HealthDocs.ai — agent-optimized documentation for Australian healthcare data APIs. Currently covers the PBS (Pharmaceutical Benefits Scheme) API v3.

**Monorepo structure** (pnpm workspaces):
- `packages/pbs-fetcher` — Fetches + analyzes PBS API data, outputs JSON schemas and relationship map
- `packages/content-generator` — Generates MDX docs, llms.txt, and OpenAPI schema from fetcher output
- `packages/mcp-server` — (Phase 4, not yet implemented) MCP server for doc search
- `site` — Astro + Starlight static docs site
- `scripts` — Orchestration scripts for the build pipeline

## Build Commands

```bash
pnpm run fetch          # Fetch from real PBS API (~6 min, results cached in packages/pbs-fetcher/data/cache/)
pnpm run fetch -- --skip-fetch  # Rebuild schemas/relationships from cached data (instant)
pnpm run generate       # Generate docs from schemas → site/src/content/docs/endpoints/, site/public/
pnpm run build:site     # Build Astro static site → site/dist/
pnpm run build          # Full pipeline: fetch → generate → build:site
pnpm run dev            # Start Astro dev server
```

## Key Technical Details

- **Node.js:** >=18.20.8 required (Astro constraint). `.nvmrc` set to 22. Run `nvm use` before commands.
- **PBS API base URL:** `https://data-api.health.gov.au/pbs/api/v3`
- **API response envelope:** `{ _meta, _links, data: [...] }` — actual records are in the `data` array
- **Field names:** API returns **lowercase** field names (e.g., `schedule_code`, `pbs_code`)
- **Schedule code:** Numeric ID (e.g., `4604`), not a date string
- **Rate limit:** 1 request per 20 seconds, shared across ALL public API users
- **Subscription key:** Default public key is hardcoded in `client.ts`; override via `PBS_SUBSCRIPTION_KEY` env var
- **Endpoints returning 404:** `item-amt` and `atc` are not available as of Feb 2026; docs generated from metadata only

## Architecture

```
PBS API → pbs-fetcher (analyze) → data/schemas/*.json + data/relationships.json
                                        ↓
                              content-generator → site/src/content/docs/endpoints/*.mdx
                                                → site/public/llms.txt
                                                → site/public/llms-full.txt
                                                → site/public/schemas/pbs-api-tools.json
                                        ↓
                                  Astro build → site/dist/ (static HTML)
```

## Generated vs Hand-Written Content

**Generated** (by content-generator, in .gitignore):
- `site/src/content/docs/endpoints/*.mdx` — one per PBS endpoint
- `site/public/llms.txt`, `llms-full.txt` — agent navigation files
- `site/public/schemas/pbs-api-tools.json` — OpenAPI 3.1 schema
- `packages/pbs-fetcher/data/schemas/`, `data/cache/`, `data/relationships.json`

**Hand-written** (committed to git):
- `site/src/content/docs/getting-started/` — overview, auth, rate limiting
- `site/src/content/docs/concepts/` — data model, entity relationships, schedules, programs, restrictions
- `site/src/content/docs/listing-process/` — how listing works, timeline & cycles, stakeholders
- `site/src/content/docs/pbac/` — overview, submission types, evaluation criteria, outcomes
- `site/src/content/docs/pricing/` — pricing overview, price types, copayment structure, price disclosure
- `site/src/content/docs/prescribing/` — authority prescribing, streamlined authority, Section 100
- `site/src/content/docs/data-integration/` — migration guide, XML-to-API mapping, AMT, data consumers
- `site/src/content/docs/glossary/` — terms, acronyms
- `site/src/content/docs/workflows/` — 6 recipe guides (find medicine, check listing, compare brands, etc.)
- `site/src/content/docs/errors/` — error codes and troubleshooting
- `packages/content-generator/src/templates/` — Handlebars templates for doc generation

## Code Conventions

- TypeScript with `"type": "module"` in all packages
- Use `fileURLToPath(import.meta.url)` for `__dirname` equivalent (not `import.meta.dirname` — Node 21+ only)
- MDX files must escape `<` before numbers/non-tag content (e.g., write "under 10KB" not "<10KB")
- Starlight `<Steps>` component requires a strict `<ol>` — don't use it with heading+content blocks
- PBS endpoint metadata (descriptions, gotchas, related endpoints) lives in `packages/pbs-fetcher/src/endpoints.ts`
- Relationship definitions live in `packages/pbs-fetcher/src/relationships.ts` as `KNOWN_RELATIONSHIPS`
