# HealthDocs.ai

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Agent-optimized documentation for the Australian PBS (Pharmaceutical Benefits Scheme) API v3. Built for AI agents, MCP servers, and developers working with pharmaceutical data.

**[Live Site](https://safee-a.github.io/pbs-docs/)** | **[llms.txt](https://safee-a.github.io/pbs-docs/llms.txt)** | **[OpenAPI Schema](https://safee-a.github.io/pbs-docs/schemas/pbs-api-tools.json)**

## What's Included

- **Documentation site** — Astro + Starlight static docs covering all PBS API endpoints, concepts, workflows, pricing, prescribing rules, and PBAC decisions
- **MCP server** — 3 tools for Claude Code: search PBAC decisions, fetch full PSD documents, search PBS docs
- **Claude Code skills** — 6 pre-built `/slash-commands` for common healthcare data tasks
- **llms.txt** — Agent navigation file for the full documentation
- **OpenAPI schema** — Machine-readable PBS API schema

## Quick Start

```bash
git clone https://github.com/safee-a/pbs-docs.git
cd pbs-docs
nvm use        # Node 22
pnpm install
pnpm run dev   # Start dev server at localhost:4321
```

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

PBS Website → pbac-scraper → data/pbac-index.json
                                   ↓
                         content-generator → site/public/pbac/index.json
                                           → llms.txt (PBAC Decisions section)

MCP Server (stdio transport):
  search_pbac_decisions — search local PBAC index (fast)
  get_pbac_decision     — fetch + parse a PSD .docx (slow, ~3-5s)
  search_pbs_docs       — search documentation via llms.txt
```

## Build Commands

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Start Astro dev server |
| `pnpm run generate` | Generate docs from committed data |
| `pnpm run build:site` | Build static site to `site/dist/` |
| `pnpm run build` | Full pipeline: fetch → generate → build |
| `pnpm run fetch` | Fetch from PBS API (~6 min, rate limited) |
| `pnpm run fetch -- --skip-fetch` | Rebuild schemas from cached data |
| `pnpm run scrape:pbac` | Scrape PBAC PSD index (~1500 documents) |

> **Note:** `pnpm run generate` and `pnpm run build:site` work from committed data files — no API calls needed. Use `pnpm run fetch` only to refresh data from the PBS API (rate limited to 1 req/20s).

## MCP Server Setup

Add to your Claude Code MCP config (`~/.claude.json` or project `.claude/mcp.json`):

```json
{
  "mcpServers": {
    "healthdocs": {
      "command": "npx",
      "args": ["tsx", "packages/mcp-server/src/index.ts"],
      "cwd": "/path/to/pbs-docs"
    }
  }
}
```

If you've cloned this repo, the `.claude/mcp.json` is already configured — the MCP tools are available automatically.

### Available MCP Tools

- **`search_pbac_decisions`** — Search the PBAC Public Summary Document index by drug name, brand, or keyword
- **`get_pbac_decision`** — Fetch and parse a specific PSD `.docx` file with structured sections
- **`search_pbs_docs`** — Search across all documentation pages

## Claude Code Skills

Six pre-built slash commands for working with PBS data:

| Skill | Description |
|-------|-------------|
| `/pbs-lookup <drug>` | Look up a medicine on PBS — pricing, restrictions, copayments |
| `/pbac-search <query>` | Search PBAC decisions by drug or brand name |
| `/pbac-decision <drug>` | Fetch and summarise a full PBAC Public Summary Document |
| `/pbs-compare <medicine>` | Compare brand vs generic — pricing and dispensing |
| `/pbs-changes` | Latest PBS schedule changes — new listings, delistings, price changes |
| `/healthcare-agent <description>` | Build a custom healthcare data agent from a description |

## Project Structure

```
packages/
  pbs-fetcher/        # Fetches + analyzes PBS API, outputs JSON schemas
  content-generator/  # Generates MDX docs, llms.txt, OpenAPI schema
  pbac-scraper/       # Scrapes PBAC PSDs from pbs.gov.au
  mcp-server/         # MCP server with 3 tools
site/                 # Astro + Starlight docs site
scripts/              # Build orchestration
.claude/
  commands/           # Claude Code slash-command skills
  mcp.json            # MCP server config (auto-loaded by Claude Code)
```

## License

MIT
