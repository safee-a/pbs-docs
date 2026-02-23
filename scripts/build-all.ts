#!/usr/bin/env tsx
/**
 * Full build pipeline: fetch → generate → build site.
 *
 * Usage:
 *   pnpm tsx scripts/build-all.ts [--skip-fetch]
 */
import { execSync } from "node:child_process";

const skipFetch = process.argv.includes("--skip-fetch");

function run(cmd: string, label: string) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${label}`);
  console.log(`${"=".repeat(60)}\n`);
  execSync(cmd, { stdio: "inherit", cwd: process.cwd() });
}

async function main() {
  const start = Date.now();

  if (!skipFetch) {
    run("pnpm --filter pbs-fetcher run fetch", "Step 1/3: Fetching PBS API data...");
  } else {
    console.log("\nSkipping fetch (--skip-fetch)");
  }

  run("pnpm --filter content-generator run generate", "Step 2/3: Generating documentation...");
  run("pnpm --filter site run build", "Step 3/3: Building static site...");

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\nBuild complete in ${elapsed}s`);
}

main().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
