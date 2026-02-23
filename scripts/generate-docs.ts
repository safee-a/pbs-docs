#!/usr/bin/env tsx
/**
 * Generate documentation from PBS API schemas.
 * Delegates to content-generator package.
 *
 * Usage:
 *   pnpm tsx scripts/generate-docs.ts
 */

// Re-export the content-generator CLI
import "../packages/content-generator/src/index.js";
