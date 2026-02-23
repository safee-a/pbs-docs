import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PbsEndpointName, EndpointMeta } from "../../../pbs-fetcher/src/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SITE_PUBLIC_DIR = path.resolve(__dirname, "../../../../site/public");
const SITE_DOCS_DIR = path.resolve(__dirname, "../../../../site/src/content/docs");

interface DocPage {
  path: string;
  title: string;
  description: string;
}

/** Generate llms.txt — lightweight agent navigation index (<10KB) */
export function generateLlmsTxt(endpoints: Record<PbsEndpointName, EndpointMeta>): void {
  fs.mkdirSync(SITE_PUBLIC_DIR, { recursive: true });

  const pages = collectDocPages(endpoints);

  const lines = [
    "# HealthDocs.ai — PBS API Documentation",
    "",
    "> Agent-optimized documentation for the Australian Pharmaceutical Benefits Scheme (PBS) API v3.",
    "> The PBS API provides programmatic access to Australia's subsidized medicines data including drug listings,",
    "> pricing, prescribing restrictions, and dispensing rules. Base URL: https://data-api.health.gov.au/pbs/api/v3",
    "> Rate limit: 1 request per 20 seconds (shared across ALL public users). No auth required for public API.",
    "> Data updates monthly on the 1st. Always filter by schedule_code to get current data.",
    "",
    "## Getting Started",
    "",
  ];

  // Getting started pages
  for (const page of pages.filter((p) => p.path.includes("getting-started"))) {
    lines.push(`- [${page.title}](/${page.path}): ${page.description}`);
  }

  lines.push("", "## API Endpoint Reference", "");

  // Endpoint pages
  for (const page of pages.filter((p) => p.path.includes("endpoints/"))) {
    lines.push(`- [${page.title}](/${page.path}): ${page.description}`);
  }

  lines.push("", "## Concepts", "");

  for (const page of pages.filter((p) => p.path.includes("concepts/"))) {
    lines.push(`- [${page.title}](/${page.path}): ${page.description}`);
  }

  lines.push("", "## Workflows", "");

  for (const page of pages.filter((p) => p.path.includes("workflows/"))) {
    lines.push(`- [${page.title}](/${page.path}): ${page.description}`);
  }

  lines.push("", "## Listing Process", "");

  for (const page of pages.filter((p) => p.path.includes("listing-process/"))) {
    lines.push(`- [${page.title}](/${page.path}): ${page.description}`);
  }

  lines.push("", "## PBAC", "");

  for (const page of pages.filter((p) => p.path.includes("pbac/"))) {
    lines.push(`- [${page.title}](/${page.path}): ${page.description}`);
  }

  lines.push("", "## Pricing", "");

  for (const page of pages.filter((p) => p.path.includes("pricing/"))) {
    lines.push(`- [${page.title}](/${page.path}): ${page.description}`);
  }

  lines.push("", "## Prescribing", "");

  for (const page of pages.filter((p) => p.path.includes("prescribing/"))) {
    lines.push(`- [${page.title}](/${page.path}): ${page.description}`);
  }

  lines.push("", "## Data Integration", "");

  for (const page of pages.filter((p) => p.path.includes("data-integration/"))) {
    lines.push(`- [${page.title}](/${page.path}): ${page.description}`);
  }

  lines.push("", "## Glossary", "");

  for (const page of pages.filter((p) => p.path.includes("glossary/"))) {
    lines.push(`- [${page.title}](/${page.path}): ${page.description}`);
  }

  lines.push("", "## Error Reference", "");

  for (const page of pages.filter((p) => p.path.includes("errors/"))) {
    lines.push(`- [${page.title}](/${page.path}): ${page.description}`);
  }

  lines.push("", "## Schemas", "");
  lines.push("- [PBS API OpenAPI Schema](/schemas/pbs-api-tools.json): Machine-readable OpenAPI 3.1 schema for all PBS API endpoints");

  // PBAC Decisions section (from pbac-scraper index, if available)
  const pbacIndexPath = path.resolve(__dirname, "../../../../packages/pbac-scraper/data/pbac-index.json");
  if (fs.existsSync(pbacIndexPath)) {
    const pbacIndex = JSON.parse(fs.readFileSync(pbacIndexPath, "utf-8"));
    const recentMeeting = pbacIndex.meetings?.[0];
    lines.push("", "## PBAC Decisions", "");
    lines.push(`> ${pbacIndex.totalPsds} Public Summary Documents (PSDs) indexed from ${pbacIndex.totalMeetings} PBAC meetings.`);
    if (recentMeeting) {
      lines.push(`> Most recent meeting: ${recentMeeting.date} (${recentMeeting.psdCount} PSDs).`);
    }
    lines.push(`> Full searchable index: [PBAC PSD Index](/pbac/index.json)`);
    lines.push("> Use the HealthDocs MCP server for search_pbac_decisions and get_pbac_decision tools.");
  }

  const content = lines.join("\n");
  const outPath = path.join(SITE_PUBLIC_DIR, "llms.txt");
  fs.writeFileSync(outPath, content, "utf-8");

  const sizeKB = (Buffer.byteLength(content, "utf-8") / 1024).toFixed(1);
  console.log(`  Generated: llms.txt (${sizeKB}KB)`);
}

/** Generate llms-full.txt — concatenation of all docs */
export function generateLlmsFullTxt(): void {
  fs.mkdirSync(SITE_PUBLIC_DIR, { recursive: true });

  const sections: string[] = [];

  // Recursively collect all .mdx files
  const mdxFiles = collectMdxFiles(SITE_DOCS_DIR);

  for (const filePath of mdxFiles.sort()) {
    const content = fs.readFileSync(filePath, "utf-8");
    // Strip frontmatter
    const stripped = content.replace(/^---[\s\S]*?---\n/, "");
    // Strip import statements
    const noImports = stripped.replace(/^import\s+.*;\n/gm, "");
    // Strip JSX components (keep text content)
    const noJsx = noImports
      .replace(/<Aside[^>]*title="([^"]*)"[^>]*>/g, "**$1:** ")
      .replace(/<\/?Aside[^>]*>/g, "")
      .replace(/<\/?Steps>/g, "")
      .replace(/<Badge[^>]*text="([^"]*)"[^>]*\/>/g, "[$1]")
      .replace(/<Tabs>[\s\S]*?<\/Tabs>/g, (match) => {
        // Extract the first tab's content
        const tabContent = match.match(/<TabItem[^>]*>([\s\S]*?)<\/TabItem>/);
        return tabContent ? tabContent[1] : "";
      })
      .replace(/<\/?TabItem[^>]*>/g, "");

    const relativePath = path.relative(SITE_DOCS_DIR, filePath);
    sections.push(`# ${relativePath}\n\n${noJsx.trim()}`);
  }

  const content = sections.join("\n\n---\n\n");
  const outPath = path.join(SITE_PUBLIC_DIR, "llms-full.txt");
  fs.writeFileSync(outPath, content, "utf-8");

  const sizeKB = (Buffer.byteLength(content, "utf-8") / 1024).toFixed(1);
  console.log(`  Generated: llms-full.txt (${sizeKB}KB)`);
}

/** Collect metadata about all doc pages */
function collectDocPages(endpoints: Record<PbsEndpointName, EndpointMeta>): DocPage[] {
  const pages: DocPage[] = [];

  // Endpoint pages
  for (const [name, meta] of Object.entries(endpoints)) {
    pages.push({
      path: `endpoints/${name}`,
      title: name,
      description: meta.agentDescription.split(".")[0] + ".",
    });
  }

  // Scan for other pages in the docs directory
  if (fs.existsSync(SITE_DOCS_DIR)) {
    const mdxFiles = collectMdxFiles(SITE_DOCS_DIR);
    for (const filePath of mdxFiles) {
      const relativePath = path.relative(SITE_DOCS_DIR, filePath).replace(/\.mdx?$/, "");
      // Skip endpoint pages (already handled) and index
      if (relativePath.startsWith("endpoints/") || relativePath === "index") continue;

      const content = fs.readFileSync(filePath, "utf-8");
      const titleMatch = content.match(/^title:\s*"?([^"\n]+)"?/m);
      const descMatch = content.match(/^description:\s*"?([^"\n]+)"?/m);

      pages.push({
        path: relativePath,
        title: titleMatch?.[1] || relativePath,
        description: descMatch?.[1] || "",
      });
    }
  }

  return pages;
}

/** Recursively collect all .mdx files in a directory */
function collectMdxFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const files: string[] = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectMdxFiles(fullPath));
    } else if (entry.name.endsWith(".mdx") || entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }

  return files;
}
