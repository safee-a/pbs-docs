---
description: Compare brand vs generic versions of a medicine on the PBS
user-invocable: true
---

Compare brand vs generic versions of "$ARGUMENTS" on the PBS.

## Instructions

1. Call the PBS API to find all items matching the medicine:
   ```
   GET https://data-api.health.gov.au/pbs/api/v3/items?search=$ARGUMENTS
   ```
   Use subscription key `2384af7c667342ceb5a736fe29f1dc6b` in the `subscription-key` query parameter.

2. The response has the shape `{ _meta, _links, data: [...] }`. Extract records from `data`.

3. Group the results by active ingredient (the `drug_name` or `li_drug_name` field). Filter to items that share the same active ingredient and form/strength.

4. For each distinct brand/form/strength, fetch copayment info:
   ```
   GET /copayments?schedule_code={schedule_code}
   ```

5. Rate limit: wait at least 20 seconds between API requests.

6. Present a comparison table:

   | Brand | Form & Strength | PBS Code | DPMQ | Dispensed Price | General Copay | Concessional Copay | Restrictions |
   |-------|----------------|----------|------|-----------------|---------------|-------------------|-------------|

7. Highlight key differences:
   - Are all brands bioequivalent (same restriction level)?
   - Price differences between brand and generic
   - Any brands with different restriction types or authority requirements
   - Brand premium (if applicable)

8. If only one brand/generic is listed, note that there's no generic alternative currently on the PBS.
