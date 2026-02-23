import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { EndpointSchema, RelationshipMap, PbsEndpointName } from "../../pbs-fetcher/src/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { PBS_ENDPOINTS } from "../../pbs-fetcher/src/endpoints.js";
import { generateEndpointDocs } from "./generators/endpoint-docs.js";
import { generateLlmsTxt, generateLlmsFullTxt } from "./generators/llms-txt.js";
import { generateOpenApiSchema } from "./generators/schema-docs.js";

const SCHEMAS_DIR = path.resolve(__dirname, "../../pbs-fetcher/data/schemas");
const RELATIONSHIPS_PATH = path.resolve(__dirname, "../../pbs-fetcher/data/relationships.json");

function loadSchemas(): Map<PbsEndpointName, EndpointSchema> {
  const schemas = new Map<PbsEndpointName, EndpointSchema>();
  if (!fs.existsSync(SCHEMAS_DIR)) return schemas;

  for (const file of fs.readdirSync(SCHEMAS_DIR)) {
    if (!file.endsWith(".json")) continue;
    const endpointName = file.replace(".json", "") as PbsEndpointName;
    const content = fs.readFileSync(path.join(SCHEMAS_DIR, file), "utf-8");
    schemas.set(endpointName, JSON.parse(content));
  }
  return schemas;
}

function loadRelationships(): RelationshipMap {
  if (!fs.existsSync(RELATIONSHIPS_PATH)) {
    console.warn("No relationships file found. Run pbs-fetcher first.");
    return { generatedAt: new Date().toISOString(), scheduleCode: "unknown", relationships: [] };
  }
  return JSON.parse(fs.readFileSync(RELATIONSHIPS_PATH, "utf-8"));
}

async function main() {
  console.log("Content Generator");
  console.log("=================\n");

  // Load data from pbs-fetcher
  const schemas = loadSchemas();
  const relationships = loadRelationships();

  if (schemas.size === 0) {
    console.warn("⚠ No schemas found. Generating docs with metadata only (no real API data).");
    console.warn("  Run 'pnpm run fetch' first to populate with real data.\n");
  } else {
    console.log(`Loaded ${schemas.size} endpoint schemas.`);
  }
  console.log(`Loaded ${relationships.relationships.length} relationships.\n`);

  // Step 1: Generate endpoint reference docs
  console.log("Step 1: Generating endpoint reference docs...");
  const endpointDocs = generateEndpointDocs(PBS_ENDPOINTS, schemas, relationships);
  console.log(`  → ${endpointDocs.length} endpoint docs generated\n`);

  // Step 2: Generate llms.txt
  console.log("Step 2: Generating llms.txt...");
  generateLlmsTxt(PBS_ENDPOINTS);

  // Step 3: Generate llms-full.txt
  console.log("\nStep 3: Generating llms-full.txt...");
  generateLlmsFullTxt();

  // Step 4: Generate OpenAPI schema
  console.log("\nStep 4: Generating OpenAPI schema...");
  generateOpenApiSchema(PBS_ENDPOINTS, schemas);

  // Step 5: Copy PBAC index to static site (if available)
  const pbacIndexSrc = path.resolve(__dirname, "../../pbac-scraper/data/pbac-index.json");
  if (fs.existsSync(pbacIndexSrc)) {
    console.log("\nStep 5: Copying PBAC index to site/public/pbac/...");
    const pbacDestDir = path.resolve(__dirname, "../../../site/public/pbac");
    fs.mkdirSync(pbacDestDir, { recursive: true });
    fs.copyFileSync(pbacIndexSrc, path.join(pbacDestDir, "index.json"));
    const sizeKB = (fs.statSync(pbacIndexSrc).size / 1024).toFixed(0);
    console.log(`  Copied: pbac/index.json (${sizeKB}KB)`);
  } else {
    console.log("\nStep 5: Skipping PBAC index (not found — run 'pnpm run scrape:pbac' to generate)");
  }

  console.log("\nDone! Generated artifacts:");
  console.log("  - site/src/content/docs/endpoints/*.mdx (endpoint reference pages)");
  console.log("  - site/public/llms.txt (agent navigation index)");
  console.log("  - site/public/llms-full.txt (complete docs for agents)");
  console.log("  - site/public/schemas/pbs-api-tools.json (OpenAPI schema)");
  if (fs.existsSync(pbacIndexSrc)) {
    console.log("  - site/public/pbac/index.json (PBAC PSD index)");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
