import os from "node:os";
import path from "node:path";
import { scrapePsdLandingPage } from "pbac-scraper/scrape-landing";
import { downloadDocx } from "pbac-scraper/download";
import { parseDocx } from "pbac-scraper/parse-docx";

const BASE_URL = "https://www.pbs.gov.au";

export interface FetchedPsd {
  drugName: string;
  brandName: string;
  formulation: string;
  meetingDate: string;
  sections: Record<string, string>;
  rawTextLength: number;
}

/**
 * Fetch and parse a single PSD on demand.
 * Downloads the .docx to a temp directory (not persisted).
 */
export async function fetchAndParsePsd(
  landingPagePath: string
): Promise<FetchedPsd> {
  const landingUrl = `${BASE_URL}${landingPagePath}`;

  // Step 1: Scrape landing page for download URL and metadata
  const downloadInfo = await scrapePsdLandingPage(landingUrl);

  if (!downloadInfo.docxUrl) {
    throw new Error(`No .docx download found on landing page: ${landingUrl}`);
  }

  // Step 2: Download .docx to temp directory
  const tmpDir = path.join(os.tmpdir(), "healthdocs-mcp");
  const docxUrl = `${BASE_URL}${downloadInfo.docxUrl}`;
  const drugSlug = landingPagePath.split("/").pop() || "psd";
  const docxPath = await downloadDocx(docxUrl, tmpDir, drugSlug);

  // Step 3: Parse the .docx
  const parsed = await parseDocx(docxPath);

  // Extract drug name from the landing page path
  const drugName = drugSlug
    .replace(/-psd-.*$/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    drugName,
    brandName: downloadInfo.brandName,
    formulation: downloadInfo.formulation,
    meetingDate: downloadInfo.meetingDate,
    sections: parsed.sections,
    rawTextLength: parsed.rawText.length,
  };
}
