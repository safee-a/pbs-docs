// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  integrations: [
    starlight({
      title: "HealthDocs.ai",
      description:
        "Agent-optimized documentation for the Australian PBS API",
      sidebar: [
        {
          label: "Getting Started",
          items: [
            { label: "Overview", slug: "getting-started/overview" },
            { label: "Authentication", slug: "getting-started/authentication" },
            { label: "Rate Limiting", slug: "getting-started/rate-limiting" },
          ],
        },
        {
          label: "API Endpoints",
          autogenerate: { directory: "endpoints" },
        },
        {
          label: "Concepts",
          items: [
            { label: "Data Model", slug: "concepts/data-model" },
            { label: "Entity Relationships", slug: "concepts/entity-relationships" },
            { label: "Schedule Lifecycle", slug: "concepts/schedule-lifecycle" },
            { label: "PBS Programs", slug: "concepts/pbs-programs" },
            { label: "Restriction System", slug: "concepts/restriction-system" },
          ],
        },
        {
          label: "Workflows",
          items: [
            { label: "Find a Medicine", slug: "workflows/find-medicine" },
            { label: "Check PBS Listing", slug: "workflows/check-listing" },
            { label: "Compare Brand vs Generic", slug: "workflows/compare-brands" },
            { label: "Understand Restrictions", slug: "workflows/understand-restrictions" },
            { label: "Calculate Patient Cost", slug: "workflows/calculate-cost" },
            { label: "Track Monthly Changes", slug: "workflows/track-changes" },
          ],
        },
        {
          label: "Errors",
          autogenerate: { directory: "errors" },
        },
      ],
    }),
  ],
});
