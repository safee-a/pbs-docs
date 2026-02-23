import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LLMS_TXT_PATH = path.resolve(
  __dirname,
  "../../../../site/public/llms.txt"
);

export interface SearchDocsInput {
  query: string;
}

export interface DocSearchResult {
  title: string;
  path: string;
  description: string;
  relevance: "high" | "medium" | "low";
}

export interface SearchDocsResult {
  totalMatches: number;
  results: DocSearchResult[];
}

/**
 * Search the static documentation by scanning llms.txt for matching entries.
 * This provides a fast search across all doc pages.
 */
export function searchDocs(input: SearchDocsInput): SearchDocsResult {
  if (!fs.existsSync(LLMS_TXT_PATH)) {
    throw new Error(
      `llms.txt not found at ${LLMS_TXT_PATH}. Run 'pnpm run generate' first.`
    );
  }

  const content = fs.readFileSync(LLMS_TXT_PATH, "utf-8");
  const queryLower = input.query.toLowerCase();
  const queryTerms = queryLower.split(/\s+/).filter((t) => t.length > 2);

  const results: DocSearchResult[] = [];

  // Parse llms.txt lines: "- [Title](/path): Description"
  const linePattern = /^- \[([^\]]+)\]\(([^)]+)\):\s*(.*)$/gm;
  let match;

  while ((match = linePattern.exec(content)) !== null) {
    const [, title, docPath, description] = match;
    const searchText = `${title} ${description}`.toLowerCase();

    // Count how many query terms match
    const matchCount = queryTerms.filter((term) =>
      searchText.includes(term)
    ).length;

    if (matchCount === 0) continue;

    let relevance: "high" | "medium" | "low";
    if (matchCount === queryTerms.length) {
      relevance = "high";
    } else if (matchCount >= queryTerms.length * 0.5) {
      relevance = "medium";
    } else {
      relevance = "low";
    }

    results.push({ title, path: docPath, description, relevance });
  }

  // Sort by relevance
  const order = { high: 0, medium: 1, low: 2 };
  results.sort((a, b) => order[a.relevance] - order[b.relevance]);

  return {
    totalMatches: results.length,
    results: results.slice(0, 20),
  };
}
