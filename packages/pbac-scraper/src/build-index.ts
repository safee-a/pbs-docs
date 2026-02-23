/** Build the full PBAC PSD index by scraping all meeting pages. */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scrapeIndexPage } from "./scrape-index.js";
import { scrapeMeetingPage, type PsdEntry } from "./scrape-meeting.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../data");
const BASE_URL = "https://www.pbs.gov.au";
const CONCURRENCY = 5;

export interface PbacIndex {
  generatedAt: string;
  totalMeetings: number;
  totalPsds: number;
  meetings: MeetingInfo[];
  psds: PsdIndexEntry[];
}

export interface MeetingInfo {
  date: string;
  path: string;
  psdCount: number;
}

export interface PsdIndexEntry {
  drugName: string;
  brandName: string;
  formulation: string;
  meetingDate: string;
  path: string;
}

/** Run the full index build pipeline. */
export async function buildIndex(): Promise<PbacIndex> {
  console.log("PBAC PSD Index Builder");
  console.log("=====================\n");

  // Step 1: Get all meeting URLs from the index page
  console.log("Step 1: Fetching meeting index page...");
  const meetingLinks = await scrapeIndexPage();
  console.log(`  Found ${meetingLinks.length} meetings\n`);

  // Step 2: Fetch each meeting page to extract PSD entries
  console.log(
    `Step 2: Scraping meeting pages (concurrency: ${CONCURRENCY})...`
  );
  const meetings: MeetingInfo[] = [];
  const allPsds: PsdIndexEntry[] = [];
  const seenPaths = new Set<string>();

  // Process in batches for concurrency control
  for (let i = 0; i < meetingLinks.length; i += CONCURRENCY) {
    const batch = meetingLinks.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (meeting) => {
        const url = `${BASE_URL}${meeting.path}`;
        const entries = await scrapeMeetingPage(url);
        return { meeting, entries };
      })
    );

    for (const result of results) {
      if (result.status === "rejected") {
        console.error(`  Failed to scrape meeting: ${result.reason}`);
        continue;
      }

      const { meeting, entries } = result.value;
      const newEntries: PsdEntry[] = [];

      for (const entry of entries) {
        if (seenPaths.has(entry.path)) continue;
        seenPaths.add(entry.path);
        newEntries.push(entry);
        allPsds.push({
          drugName: entry.drugName,
          brandName: entry.brandName,
          formulation: entry.formulation,
          meetingDate: meeting.date,
          path: entry.path,
        });
      }

      meetings.push({
        date: meeting.date,
        path: meeting.path,
        psdCount: newEntries.length,
      });
    }

    const progress = Math.min(i + CONCURRENCY, meetingLinks.length);
    console.log(
      `  Progress: ${progress}/${meetingLinks.length} meetings (${allPsds.length} PSDs found)`
    );
  }

  // Build the index object
  const index: PbacIndex = {
    generatedAt: new Date().toISOString(),
    totalMeetings: meetings.length,
    totalPsds: allPsds.length,
    meetings,
    psds: allPsds,
  };

  // Save to disk
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const outPath = path.join(DATA_DIR, "pbac-index.json");
  fs.writeFileSync(outPath, JSON.stringify(index, null, 2), "utf-8");

  const sizeKB = (Buffer.byteLength(JSON.stringify(index), "utf-8") / 1024).toFixed(0);
  console.log(`\nDone! Index saved to: ${outPath}`);
  console.log(`  Meetings: ${index.totalMeetings}`);
  console.log(`  PSDs: ${index.totalPsds}`);
  console.log(`  Size: ${sizeKB}KB`);

  return index;
}
