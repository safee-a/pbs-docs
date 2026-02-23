#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  searchDecisions,
  type SearchDecisionsResult,
} from "./tools/search-decisions.js";
import { getDecision } from "./tools/get-decision.js";
import {
  searchDocs,
  type SearchDocsResult,
} from "./tools/search-docs.js";

const server = new McpServer({
  name: "healthdocs",
  version: "0.1.0",
});

// Tool 1: Search PBAC decisions index
server.tool(
  "search_pbac_decisions",
  "Search the PBAC Public Summary Document (PSD) index by drug name, brand name, or formulation. Fast — searches a local JSON index, no HTTP requests. Returns matching entries with metadata.",
  {
    query: z.string().describe("Drug name, brand name, or keyword to search for"),
    meetingDate: z
      .string()
      .optional()
      .describe("Filter by meeting date (e.g., 'March 2025', '2024')"),
    limit: z
      .number()
      .optional()
      .describe("Maximum number of results to return (default: 20)"),
  },
  async (args) => {
    try {
      const result: SearchDecisionsResult = searchDecisions(args);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool 2: Get full PBAC decision (on-demand fetch + parse)
server.tool(
  "get_pbac_decision",
  "Fetch and parse a specific PBAC Public Summary Document (PSD). Slow (~3-5 seconds) — downloads and parses the .docx file on demand. Use search_pbac_decisions first to find the path, then use this tool to get the full content.",
  {
    path: z
      .string()
      .describe(
        "Landing page path from search results (e.g., '/info/industry/.../amivantamab-psd-march-2025')"
      ),
  },
  async (args) => {
    try {
      const result = await getDecision(args);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool 3: Search PBS documentation
server.tool(
  "search_pbs_docs",
  "Search the PBS API documentation for relevant pages. Searches across all doc pages including endpoint references, concepts, workflows, and guides. Returns matching page titles, paths, and descriptions.",
  {
    query: z
      .string()
      .describe(
        "Search query (e.g., 'pricing', 'restrictions', 'copayment')"
      ),
  },
  async (args) => {
    try {
      const result: SearchDocsResult = searchDocs(args);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Start the server with stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("HealthDocs MCP server started on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
