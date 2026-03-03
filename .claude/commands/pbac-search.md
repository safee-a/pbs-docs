Search PBAC (Pharmaceutical Benefits Advisory Committee) decisions for "$ARGUMENTS".

## Instructions

1. Read the PBAC index file at `packages/pbac-scraper/data/pbac-index.json`.

2. Search the entries by matching `$ARGUMENTS` against:
   - `drugName` (active ingredient)
   - `brandName`
   - `indication` (if present)
   - `title`

   Use case-insensitive matching. Match partial strings.

3. Sort results by meeting date (most recent first).

4. Present matching results in a table:

   | Drug | Brand | Meeting | Outcome | Type |
   |------|-------|---------|---------|------|

   Include the `path` field — this is needed to fetch the full PSD with `/pbac-decision`.

5. If there are many results, show the 10 most recent and note how many total were found.

6. If no results match, suggest:
   - Trying the active ingredient name instead of brand name (or vice versa)
   - Checking spelling
   - Browsing recent meetings at pbs.gov.au
