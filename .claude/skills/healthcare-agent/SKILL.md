---
description: Build a custom healthcare data agent from a description
user-invocable: true
---

Build a custom healthcare data agent based on this description: "$ARGUMENTS"

## Instructions

You are helping the user create a working script or Claude Code skill that interacts with Australian healthcare data. Guide them through the process step by step.

### Step 1: Identify the data sources needed

Based on the user's description, determine which PBS API endpoints and/or PBAC data are relevant. The available endpoints are:

- `/schedules` — PBS schedule metadata (current and historical)
- `/items` — Individual PBS items (medicines) with pricing
- `/item-overview` — Grouped view of items by drug
- `/restrictions` — Prescribing restrictions and authority requirements
- `/copayments` — Patient copayment amounts
- `/prescribers` — Prescriber types (GP, specialist)
- `/organisations` — Approved suppliers and organisations
- `/fees` — Dispensing and markup fees
- `/dispensing-rules` — Dispensing rules by program
- `/programs` — PBS programs (General, Section 100, etc.)
- `/summary-of-changes` — Monthly schedule changes
- `/markup-bands` — Pharmacy markup bands
- `/criteria` — Clinical criteria for prescribing
- `/parameters` — System parameters
- `/program-dispensing-rules` — Program-level dispensing rules

Additionally:
- PBAC index at `packages/pbac-scraper/data/pbac-index.json` for decision history
- PBAC PSDs (Public Summary Documents) for detailed evaluation reports

### Step 2: Design the API call sequence

- **Base URL:** `https://data-api.health.gov.au/pbs/api/v3`
- **Auth:** Query parameter `subscription-key=2384af7c667342ceb5a736fe29f1dc6b`
- **Rate limit:** 1 request per 20 seconds (shared across all users of the public key)
- **Response envelope:** `{ _meta, _links, data: [...] }` — records are in the `data` array
- **Field names:** All lowercase with underscores (e.g., `schedule_code`, `pbs_code`)
- **Pagination:** Use `_links.next` to get the next page of results

### Step 3: Write the implementation

Choose the output format based on the user's needs:
- **Claude Code skill** (`.claude/skills/*/SKILL.md`) — if they want a reusable slash command
- **Node.js script** — if they want a standalone tool
- **Shell script** — if they want something quick with `curl`

Include:
- Proper rate limiting (20s delay between requests)
- Response envelope unwrapping (`response.data`)
- Error handling for 404s and rate limit errors (429)
- Formatted output

### Step 4: Test and iterate

Run the agent or script and verify it produces the expected output. Suggest improvements.
