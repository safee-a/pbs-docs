import mammoth from "mammoth";
import fs from "node:fs";

/**
 * Canonical section names for structured output.
 * Modern PSDs (2024+) use slightly different headings than the older template,
 * so we normalize to these canonical names.
 */
const CANONICAL_SECTIONS = [
  "Purpose",
  "Background",
  "Registration status",
  "Previous PBAC consideration",
  "Requested listing",
  "Population and disease",
  "Clinical place",
  "Comparator",
  "Consideration of the evidence",
  "Sponsor hearing",
  "Clinical trials",
  "Comparative effectiveness",
  "Comparative harms",
  "Benefits and harms",
  "Clinical claim",
  "Economic analysis",
  "Drug cost",
  "Estimated PBS usage and financial implications",
  "Quality use of medicines",
  "Recommendations and reasons",
  "Context for decision",
  "Sponsor comments",
  "Financial management",
] as const;

export type SectionName = (typeof CANONICAL_SECTIONS)[number];

export interface ParsedPsd {
  sections: Record<string, string>;
  rawText: string;
}

/** Parse a .docx PSD file into structured sections using mammoth. */
export async function parseDocx(filePath: string): Promise<ParsedPsd> {
  const buffer = fs.readFileSync(filePath);

  // Convert to HTML to preserve structure
  const { value: html } = await mammoth.convertToHtml({ buffer });

  // Get raw text for full-text storage
  const { value: rawText } = await mammoth.extractRawText({ buffer });

  // Parse sections using _Toc anchor markers
  const sections = extractSectionsByTocAnchors(html);

  return { sections, rawText };
}

/**
 * Extract sections using _Toc anchor IDs as section markers.
 * PSD .docx files embed _Toc anchors at the start of each section heading.
 */
function extractSectionsByTocAnchors(html: string): Record<string, string> {
  const sections: Record<string, string> = {};

  // Find all _Toc anchors and the text that follows them
  // Pattern: <a id="_TocNNNN"></a>SectionTitle
  const tocPattern = /<a id="_Toc\d+"><\/a>/g;
  const tocPositions: { index: number; endIndex: number }[] = [];

  let match;
  while ((match = tocPattern.exec(html)) !== null) {
    tocPositions.push({
      index: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  if (tocPositions.length === 0) {
    // Fallback: no _Toc anchors, return raw text as single section
    return { "Full text": stripHtml(html) };
  }

  // Group consecutive _Toc anchors (multiple anchors at the same heading)
  // and extract the heading text after the last anchor in the group
  const headings: { title: string; contentStart: number }[] = [];

  for (let i = 0; i < tocPositions.length; i++) {
    // Check if next _Toc anchor is immediately adjacent (within same element)
    const isPartOfGroup =
      i + 1 < tocPositions.length &&
      tocPositions[i + 1].index - tocPositions[i].endIndex < 50 &&
      !html
        .substring(tocPositions[i].endIndex, tocPositions[i + 1].index)
        .match(/[a-zA-Z]{3,}/);

    if (isPartOfGroup) continue; // Skip to last anchor in group

    // Extract heading text: everything from after the anchor to the next tag or significant markup
    const afterAnchor = html.substring(tocPositions[i].endIndex);

    // Get text until next HTML block-level element or closing tag
    const headingTextMatch = afterAnchor.match(
      /^([^<]*?)(?:<\/|<(?:ol|ul|p|table|br))/
    );
    let headingText = headingTextMatch
      ? headingTextMatch[1].trim()
      : afterAnchor.substring(0, 200).replace(/<[^>]+>/g, "").trim();

    // Clean up: remove tab characters, numbering, extra whitespace
    headingText = headingText
      .replace(/^\d+\.\d*\s*/, "") // Remove "5.01" numbering
      .replace(/\t/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!headingText || headingText.length < 3) continue;
    // Skip table headings and other non-section content
    if (headingText.length > 150) continue;

    // Find where the content for this section starts
    // It's after the current heading, at the next meaningful content
    const contentStartIdx = tocPositions[i].endIndex;

    headings.push({ title: headingText, contentStart: contentStartIdx });
  }

  // Extract content between section headings
  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    const nextStart =
      i + 1 < headings.length
        ? findTocAnchorBefore(html, headings[i + 1].contentStart)
        : html.length;

    const contentHtml = html.substring(heading.contentStart, nextStart);
    const contentText = stripHtml(contentHtml).trim();

    if (!contentText || contentText.length < 10) continue;

    // Normalize the heading name to a canonical section
    const canonicalName = normalizeHeading(heading.title);
    sections[canonicalName] = contentText;
  }

  return sections;
}

/** Find the start position of the _Toc anchor group before a given position. */
function findTocAnchorBefore(html: string, pos: number): number {
  // Look backwards from pos to find the first _Toc anchor in the group
  const searchStart = Math.max(0, pos - 500);
  const searchRegion = html.substring(searchStart, pos);
  const anchors = [...searchRegion.matchAll(/<a id="_Toc\d+"><\/a>/g)];

  if (anchors.length > 0) {
    // Find the first anchor in the consecutive group
    for (let i = anchors.length - 1; i >= 0; i--) {
      if (i === 0) return searchStart + anchors[i].index!;
      const gap =
        anchors[i].index! -
        (anchors[i - 1].index! + anchors[i - 1][0].length);
      if (gap > 50) return searchStart + anchors[i].index!;
    }
    return searchStart + anchors[0].index!;
  }

  return pos;
}

/** Normalize a heading to a canonical section name. */
function normalizeHeading(heading: string): string {
  const lower = heading.toLowerCase().trim();

  // Map common variations to canonical names
  const mappings: [RegExp, string][] = [
    [/^purpose\b/, "Purpose"],
    [/^background\b/, "Background"],
    [/^registration\s+status/, "Registration status"],
    [/^previous\s+pbac/, "Previous PBAC consideration"],
    [/^requested\s+listing/, "Requested listing"],
    [/^listing\s+requested/, "Requested listing"],
    [/^population\s+and\s+disease/, "Population and disease"],
    [/^clinical\s+place/, "Clinical place"],
    [/^comparator/, "Comparator"],
    [/^consideration\s+of\s+the\s+evidence/, "Consideration of the evidence"],
    [/^sponsor\s+hearing/, "Sponsor hearing"],
    [/^clinical\s+trials?\b/, "Clinical trials"],
    [/^comparative\s+effectiveness/, "Comparative effectiveness"],
    [/^comparative\s+harms/, "Comparative harms"],
    [/^benefits?\s*\/?\s*harms?/, "Benefits and harms"],
    [/^clinical\s+claim/, "Clinical claim"],
    [/^economic\s+analysis/, "Economic analysis"],
    [/^(?:drug\s+)?cost\s*\/?\s*patient/, "Drug cost"],
    [/^estimated\s+pbs\s+usage/, "Estimated PBS usage and financial implications"],
    [/^quality\s+use\s+of\s+medicines/, "Quality use of medicines"],
    [/^recommendations?\s+and\s+reasons?/, "Recommendations and reasons"],
    [/^context\s+for\s+decision/, "Context for decision"],
    [/^sponsor.s?\s+comments?/, "Sponsor comments"],
    [/^financial\s+management/, "Financial management"],
    [/^results?\s+of\s+trials?/, "Results of trials"],
  ];

  for (const [pattern, canonical] of mappings) {
    if (pattern.test(lower)) return canonical;
  }

  // Return original heading with first letter capitalized if no match
  return heading.charAt(0).toUpperCase() + heading.slice(1);
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
