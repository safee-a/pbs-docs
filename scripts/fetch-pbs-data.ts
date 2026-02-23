#!/usr/bin/env tsx
/**
 * Fetch PBS API data and generate schemas + relationship map.
 * Delegates to pbs-fetcher package.
 *
 * Usage:
 *   pnpm tsx scripts/fetch-pbs-data.ts [--no-cache] [--skip-fetch]
 */

// Re-export the pbs-fetcher CLI
import "../packages/pbs-fetcher/src/index.js";
