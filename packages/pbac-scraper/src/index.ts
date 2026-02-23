import { scrapeMeetingPage } from "./scrape-meeting.js";
import { scrapePsdLandingPage } from "./scrape-landing.js";
import { downloadDocx } from "./download.js";
import { parseDocx } from "./parse-docx.js";
import { buildIndex } from "./build-index.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../data");

const BASE_URL = "https://www.pbs.gov.au";

// Default: most recent populated meeting
const DEFAULT_MEETING_PATH =
  "/info/industry/listing/elements/pbac-meetings/psd/pbac-public-summary-documents-march-2025";

const args = process.argv.slice(2);
const isTestMode = args.includes("--test");

if (isTestMode) {
  runTestMode().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
} else {
  buildIndex().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}

/** Test mode: scrape a few PSDs from the latest meeting (prototype behavior). */
async function runTestMode() {
  const meetingPath =
    args.find((a: string) => a.startsWith("/")) || DEFAULT_MEETING_PATH;
  const maxPsds = 3;

  console.log("PBAC PSD Scraper — Test Mode");
  console.log("============================\n");

  // Step 1: Scrape meeting listing page
  console.log(`Step 1: Fetching meeting page: ${meetingPath}`);
  const meetingUrl = `${BASE_URL}${meetingPath}`;
  const psdEntries = await scrapeMeetingPage(meetingUrl);
  console.log(`  Found ${psdEntries.length} PSD entries\n`);

  // Limit for test mode
  const toProcess = psdEntries.slice(0, maxPsds);
  console.log(`  Processing first ${toProcess.length} PSDs...\n`);

  const results = [];

  for (const entry of toProcess) {
    console.log(`Step 2: Fetching PSD landing page: ${entry.drugName}`);

    // Step 2: Scrape individual PSD landing page to get download URLs
    const landingUrl = `${BASE_URL}${entry.path}`;
    const downloadInfo = await scrapePsdLandingPage(landingUrl);

    if (!downloadInfo.docxUrl) {
      console.log(`  No .docx download found, skipping\n`);
      continue;
    }

    console.log(`  Found .docx: ${downloadInfo.docxUrl}`);

    // Step 3: Download the .docx file
    console.log(`Step 3: Downloading .docx...`);
    const docxPath = await downloadDocx(
      `${BASE_URL}${downloadInfo.docxUrl}`,
      DATA_DIR,
      entry.drugName
    );
    console.log(`  Saved to: ${docxPath}`);

    // Step 4: Parse the .docx
    console.log(`Step 4: Parsing .docx...`);
    const parsed = await parseDocx(docxPath);

    const result = {
      drugName: entry.drugName,
      brandName: downloadInfo.brandName || entry.brandName,
      formulation: downloadInfo.formulation || entry.formulation,
      meetingDate: downloadInfo.meetingDate || "",
      sourceUrl: landingUrl,
      docxUrl: `${BASE_URL}${downloadInfo.docxUrl}`,
      sections: parsed.sections,
      rawTextLength: parsed.rawText.length,
      rawText: parsed.rawText,
    };

    results.push(result);
    console.log(
      `  Parsed ${Object.keys(parsed.sections).length} sections (${parsed.rawText.length} chars)\n`
    );
  }

  // Save results
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const outPath = path.join(DATA_DIR, "prototype-results.json");
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), "utf-8");
  console.log(`\nDone! Results saved to: ${outPath}`);

  // Print summary
  console.log("\n=== Summary ===\n");
  for (const r of results) {
    console.log(`${r.drugName} (${r.brandName})`);
    console.log(`  Meeting: ${r.meetingDate}`);
    console.log(`  Sections found: ${Object.keys(r.sections).join(", ")}`);
    console.log(
      `  Total text: ${(r.rawTextLength / 1024).toFixed(1)}KB`
    );
    console.log();
  }
}
