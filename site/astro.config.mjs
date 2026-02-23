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
          label: "Listing Process",
          items: [
            { label: "How Listing Works", slug: "listing-process/how-listing-works" },
            { label: "Timeline & Cycles", slug: "listing-process/timeline-and-cycles" },
            { label: "Stakeholders", slug: "listing-process/stakeholders" },
          ],
        },
        {
          label: "PBAC",
          items: [
            { label: "Overview", slug: "pbac/overview" },
            { label: "Submission Types", slug: "pbac/submission-types" },
            { label: "Evaluation Criteria", slug: "pbac/evaluation-criteria" },
            { label: "Outcomes", slug: "pbac/outcomes-and-recommendations" },
          ],
        },
        {
          label: "Pricing",
          items: [
            { label: "Pricing Overview", slug: "pricing/pricing-overview" },
            { label: "Price Types", slug: "pricing/price-types" },
            { label: "Copayment Structure", slug: "pricing/copayment-structure" },
            { label: "Price Disclosure", slug: "pricing/price-disclosure" },
          ],
        },
        {
          label: "Prescribing",
          items: [
            { label: "Authority Prescribing", slug: "prescribing/authority-prescribing" },
            { label: "Streamlined Authority", slug: "prescribing/streamlined-authority" },
            { label: "Section 100", slug: "prescribing/section-100" },
          ],
        },
        {
          label: "Data Integration",
          items: [
            { label: "Migration Guide", slug: "data-integration/migration-guide" },
            { label: "XML to API Mapping", slug: "data-integration/xml-to-api-mapping" },
            { label: "AMT Integration", slug: "data-integration/amt-integration" },
            { label: "Data Consumers", slug: "data-integration/data-consumers" },
          ],
        },
        {
          label: "Glossary",
          items: [
            { label: "Terms", slug: "glossary/terms" },
            { label: "Acronyms", slug: "glossary/acronyms" },
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
