Fetch and summarise the PBAC Public Summary Document (PSD) for "$ARGUMENTS".

## Instructions

1. First, search for the drug in `packages/pbac-scraper/data/pbac-index.json` to find the matching entry and its `path` field. Use case-insensitive matching against `drugName`, `brandName`, and `title`.

2. If multiple matches are found, pick the most recent one (latest meeting date). If the user seems to want a specific meeting, ask.

3. Fetch the PSD landing page from pbs.gov.au:
   ```
   GET https://www.pbs.gov.au{path}
   ```

4. On the landing page, find the `.docx` download link. It's typically in an anchor tag with href ending in `.docx`.

5. Download the `.docx` file.

6. Parse the `.docx` content. The document uses Word table-of-contents `_Toc` anchors to mark sections. Key sections to extract:
   - **Purpose of Application**
   - **Requested listing**
   - **Clinical claim**
   - **Economic analysis**
   - **Estimated PBS usage and financial implications**
   - **Recommendation and reasons**

7. Present a structured summary:
   - **Drug:** name and brand
   - **Meeting:** date
   - **Recommendation:** (Recommended / Not recommended / Deferred)
   - **Clinical Claim:** one-paragraph summary
   - **Economic Analysis:** type (cost-effectiveness, cost-minimisation, etc.) and key findings
   - **Financial Impact:** estimated PBS cost
   - **Key Reasons:** why PBAC made this recommendation

8. If the .docx cannot be fetched or parsed, fall back to whatever metadata is available from the index entry.
