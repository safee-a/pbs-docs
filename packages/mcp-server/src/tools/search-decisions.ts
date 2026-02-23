import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PbacIndex, PsdIndexEntry } from "pbac-scraper/build-index";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDEX_PATH = path.resolve(
  __dirname,
  "../../../pbac-scraper/data/pbac-index.json"
);

let cachedIndex: PbacIndex | null = null;

function loadIndex(): PbacIndex {
  if (cachedIndex) return cachedIndex;
  if (!fs.existsSync(INDEX_PATH)) {
    throw new Error(
      `PBAC index not found at ${INDEX_PATH}. Run 'pnpm run scrape:pbac' first.`
    );
  }
  cachedIndex = JSON.parse(fs.readFileSync(INDEX_PATH, "utf-8"));
  return cachedIndex!;
}

export interface SearchDecisionsInput {
  query: string;
  meetingDate?: string;
  limit?: number;
}

export interface SearchDecisionsResult {
  totalMatches: number;
  results: PsdIndexEntry[];
  indexDate: string;
  totalPsdsInIndex: number;
}

/** Search the PBAC PSD index by drug name, brand name, or formulation. */
export function searchDecisions(
  input: SearchDecisionsInput
): SearchDecisionsResult {
  const index = loadIndex();
  const { query, meetingDate, limit = 20 } = input;
  const queryLower = query.toLowerCase();

  let matches = index.psds.filter((psd) => {
    const searchableText = [psd.drugName, psd.brandName, psd.formulation]
      .join(" ")
      .toLowerCase();
    return searchableText.includes(queryLower);
  });

  // Optional meeting date filter
  if (meetingDate) {
    const dateLower = meetingDate.toLowerCase();
    matches = matches.filter((psd) =>
      psd.meetingDate.toLowerCase().includes(dateLower)
    );
  }

  return {
    totalMatches: matches.length,
    results: matches.slice(0, limit),
    indexDate: index.generatedAt,
    totalPsdsInIndex: index.totalPsds,
  };
}
