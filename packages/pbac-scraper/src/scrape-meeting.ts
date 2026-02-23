/** Scrape a PBAC meeting PSD listing page to extract individual PSD entries. */

export interface PsdEntry {
  drugName: string;
  brandName: string;
  formulation: string;
  path: string;
}

export async function scrapeMeetingPage(url: string): Promise<PsdEntry[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const html = await res.text();

  const entries: PsdEntry[] = [];

  // PSD links follow the pattern: /info/industry/listing/elements/pbac-meetings/psd/YYYY-MM/drug-name-psd-...
  // They appear as <a href="...">Drug Name</a> within list items
  // The list items typically contain: Drug Name; Formulation; Brand®
  const linkPattern =
    /href="(\/info\/industry\/listing\/elements\/pbac-meetings\/psd\/\d{4}-\d{2}\/[^"]+)"/g;

  const seen = new Set<string>();
  let match;

  while ((match = linkPattern.exec(html)) !== null) {
    const psdPath = match[1];
    if (seen.has(psdPath)) continue;
    seen.add(psdPath);

    // Extract the surrounding context for drug/brand/formulation
    // Find the <li> or <a> context around this link
    const linkIdx = match.index;
    const contextStart = Math.max(0, linkIdx - 200);
    const contextEnd = Math.min(html.length, linkIdx + 500);
    const context = html.substring(contextStart, contextEnd);

    // Try to extract the link text
    const linkTextMatch = context.match(
      new RegExp(
        `href="${escapeRegex(psdPath)}"[^>]*>([^<]+)</a>`
      )
    );

    let drugName = "";
    let brandName = "";
    let formulation = "";

    if (linkTextMatch) {
      const text = linkTextMatch[1].trim();
      // Link text is often just the drug name
      drugName = text;
    }

    // Try to extract from the broader list item text
    // Pattern: "DrugName; Formulation; Brand®"
    const liMatch = context.match(/<li[^>]*>([\s\S]*?)<\/li>/);
    if (liMatch) {
      const liText = liMatch[1]
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

      const parts = liText.split(";").map((s) => s.trim());
      if (parts.length >= 1) drugName = drugName || parts[0];
      if (parts.length >= 2) formulation = parts[1];
      if (parts.length >= 3) brandName = parts[2].replace(/®/g, "").trim();
    }

    // Fallback: derive drug name from URL slug
    if (!drugName) {
      const slug = psdPath.split("/").pop() || "";
      drugName = slug
        .replace(/-psd-.*$/, "")
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }

    entries.push({ drugName, brandName, formulation, path: psdPath });
  }

  return entries;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
