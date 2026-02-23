/** Scrape the main PBAC PSD listing page to discover all meeting URLs. */

export interface MeetingLink {
  date: string;
  path: string;
}

const PSD_INDEX_URL =
  "https://www.pbs.gov.au/info/industry/listing/elements/pbac-meetings/psd";

/**
 * Scrape the top-level PSD index page to get all meeting page URLs.
 * Returns an array of meeting links sorted by date (newest first).
 */
export async function scrapeIndexPage(): Promise<MeetingLink[]> {
  const res = await fetch(PSD_INDEX_URL);
  if (!res.ok) throw new Error(`Failed to fetch PSD index: ${res.status}`);
  const html = await res.text();

  const meetings: MeetingLink[] = [];
  const seen = new Set<string>();

  // Meeting links follow the pattern: /info/industry/listing/elements/pbac-meetings/psd/pbac-public-summary-documents-month-year
  const linkPattern =
    /href="(\/info\/industry\/listing\/elements\/pbac-meetings\/psd\/pbac-public-summary-documents[^"]+)"/g;

  let match;
  while ((match = linkPattern.exec(html)) !== null) {
    const meetingPath = match[1];
    if (seen.has(meetingPath)) continue;
    seen.add(meetingPath);

    // Extract date from the URL slug
    // e.g., "pbac-public-summary-documents-march-2025" → "March 2025"
    const slug = meetingPath.split("/").pop() || "";
    const dateStr = extractDateFromSlug(slug);

    meetings.push({ date: dateStr, path: meetingPath });
  }

  return meetings;
}

/** Extract a human-readable date from a meeting URL slug. */
function extractDateFromSlug(slug: string): string {
  // Remove the prefix
  const datePart = slug
    .replace(/^pbac-public-summary-documents-/, "")
    .replace(/-/g, " ");

  // Capitalize month names
  const months = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
  ];

  const words = datePart.split(" ");
  const capitalized = words.map((w) => {
    if (months.includes(w.toLowerCase())) {
      return w.charAt(0).toUpperCase() + w.slice(1);
    }
    return w;
  });

  return capitalized.join(" ");
}
