---
description: Show the latest PBS schedule changes — new listings, delistings, price changes
user-invocable: true
---

Show the latest PBS schedule changes.

## Instructions

1. Call the PBS API to get the summary of changes:
   ```
   GET https://data-api.health.gov.au/pbs/api/v3/summary-of-changes
   ```
   Use subscription key `2384af7c667342ceb5a736fe29f1dc6b` in the `subscription-key` query parameter.

2. The response has the shape `{ _meta, _links, data: [...] }`. Extract records from `data`.

3. Categorise the changes into:
   - **New Listings** — medicines added to the PBS
   - **Delistings** — medicines removed
   - **Price Changes** — increases or decreases
   - **Restriction Changes** — modified access conditions
   - **Other Changes** — any remaining

4. For each category, present a summary table:

   | Drug | Brand | Change Type | Details | Effective Date |
   |------|-------|-------------|---------|----------------|

5. Highlight the most significant changes:
   - New listings (especially for previously unavailable medicines)
   - Major price reductions
   - Restriction relaxations (broader access)

6. If the user provided arguments ("$ARGUMENTS"), filter results to only show changes matching that search term.

7. Note the schedule code and effective date for the current schedule.
