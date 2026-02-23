import "dotenv/config";
import { PbsClient } from "./client.js";
import { analyzeAllEndpoints, detectForeignKeys, loadSavedSchemas } from "./analyzer.js";
import { buildRelationshipMap, saveRelationshipMap } from "./relationships.js";

async function main() {
  const args = process.argv.slice(2);
  const useCache = !args.includes("--no-cache");
  const skipFetch = args.includes("--skip-fetch");

  console.log("PBS Data Fetcher & Analyzer");
  console.log("==========================\n");

  if (skipFetch) {
    console.log("Loading cached schemas (--skip-fetch)...\n");
    const schemas = loadSavedSchemas();
    if (schemas.size === 0) {
      console.error("No cached schemas found. Run without --skip-fetch first.");
      process.exit(1);
    }
    console.log(`Loaded ${schemas.size} schemas from cache.\n`);

    // Detect foreign keys and build relationships
    detectForeignKeys(schemas);
    const scheduleCode = schemas.values().next().value!.scheduleCode;
    const relationshipMap = buildRelationshipMap(scheduleCode, schemas);
    saveRelationshipMap(relationshipMap);
    return;
  }

  const client = new PbsClient({
    requestSpacing: useCache ? 21_000 : 21_000, // Always respect rate limit
  });

  // Step 1: Get latest schedule
  console.log("Step 1: Getting latest schedule code...");
  const scheduleCode = await client.getLatestScheduleCode();
  console.log(`  Latest schedule: ${scheduleCode}\n`);

  // Step 2: Fetch and analyze all endpoints
  console.log("Step 2: Fetching and analyzing all endpoints...");
  console.log("  (This takes ~6 minutes due to rate limiting)\n");
  const schemas = await analyzeAllEndpoints(client, scheduleCode);
  console.log(`\nAnalyzed ${schemas.size} endpoints.\n`);

  // Step 3: Detect foreign key relationships
  console.log("Step 3: Detecting foreign key relationships...");
  detectForeignKeys(schemas);

  // Step 4: Build and save relationship map
  console.log("Step 4: Building relationship map...");
  const relationshipMap = buildRelationshipMap(scheduleCode, schemas);
  saveRelationshipMap(relationshipMap);

  console.log("\nDone! Generated artifacts:");
  console.log("  - packages/pbs-fetcher/data/schemas/*.json (endpoint schemas)");
  console.log("  - packages/pbs-fetcher/data/relationships.json (entity relationships)");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
