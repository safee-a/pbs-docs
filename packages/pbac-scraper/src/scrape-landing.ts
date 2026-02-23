/** Scrape an individual PSD landing page to get download URLs and metadata. */

export interface PsdDownloadInfo {
  pdfUrl: string | null;
  docxUrl: string | null;
  brandName: string;
  formulation: string;
  meetingDate: string;
}

export async function scrapePsdLandingPage(
  url: string
): Promise<PsdDownloadInfo> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const html = await res.text();

  // Extract .docx download link
  const docxMatch = html.match(
    /href="(\/industry\/listing\/elements\/pbac-meetings\/psd\/[^"]+\.docx)"/
  );

  // Extract .pdf download link
  const pdfMatch = html.match(
    /href="(\/industry\/listing\/elements\/pbac-meetings\/psd\/[^"]+\.pdf)"/
  );

  // Extract page title — typically: "Drug Name; Formulation; Brand®"
  const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  let brandName = "";
  let formulation = "";

  if (titleMatch) {
    const titleText = titleMatch[1]
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const parts = titleText.split(";").map((s) => s.trim());
    if (parts.length >= 2) formulation = parts[1];
    if (parts.length >= 3) brandName = parts[2].replace(/®/g, "").trim();
  }

  // Extract meeting date from the page content
  const dateMatch = html.match(
    /(?:Public Summary Document|PSD)\s*[-–—]?\s*((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/i
  );
  const meetingDate = dateMatch ? dateMatch[1] : "";

  return {
    pdfUrl: pdfMatch ? pdfMatch[1] : null,
    docxUrl: docxMatch ? docxMatch[1] : null,
    brandName,
    formulation,
    meetingDate,
  };
}
