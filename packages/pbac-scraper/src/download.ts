import fs from "node:fs";
import path from "node:path";

/** Download a .docx file and save to the data directory. */
export async function downloadDocx(
  url: string,
  dataDir: string,
  drugName: string
): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());

  const docsDir = path.join(dataDir, "docx");
  fs.mkdirSync(docsDir, { recursive: true });

  // Use the filename from URL, falling back to drug name
  const urlFilename = url.split("/").pop() || "";
  const filename =
    urlFilename || `${drugName.toLowerCase().replace(/\s+/g, "-")}.docx`;

  const outPath = path.join(docsDir, filename);
  fs.writeFileSync(outPath, buffer);

  return outPath;
}
