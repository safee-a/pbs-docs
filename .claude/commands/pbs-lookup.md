Look up the medicine "$ARGUMENTS" on the Australian PBS (Pharmaceutical Benefits Scheme).

## Instructions

1. Call the PBS API to search for matching items:
   ```
   GET https://data-api.health.gov.au/pbs/api/v3/items?search=$ARGUMENTS
   ```
   Use subscription key `2384af7c667342ceb5a736fe29f1dc6b` in the `subscription-key` query parameter.

2. The response has the shape `{ _meta, _links, data: [...] }`. Extract records from `data`.

3. For the top matching item(s), fetch additional details:
   - **Restrictions:** `GET /items/{pbs_code}/restrictions`
   - **Copayments:** `GET /copayments?schedule_code={schedule_code}`

4. Rate limit: wait at least 20 seconds between API requests.

5. Present a formatted summary including:
   - **Drug name** and brand name(s)
   - **PBS code** and schedule code
   - **Listing status** (Section 85 / Section 100 / etc.)
   - **Price** (DPMQ, dispensed price)
   - **Copayment** (general and concessional)
   - **Restrictions** (any authority required, streamlined, unrestricted)
   - **Prescriber type** (GP, specialist, etc.)

6. If no results are found, suggest checking the spelling or trying the active ingredient name instead of brand name.
