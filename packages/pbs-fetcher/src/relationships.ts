import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { EndpointSchema, EntityRelationship, PbsEndpointName, RelationshipMap } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RELATIONSHIPS_PATH = path.resolve(__dirname, "../data/relationships.json");

/**
 * Known PBS entity relationships, curated from API analysis.
 * These are the authoritative relationships — the analyzer confirms them with data.
 */
const KNOWN_RELATIONSHIPS: EntityRelationship[] = [
  {
    from: "schedules",
    fromField: "SCHEDULE_CODE",
    to: "items",
    toField: "SCHEDULE_CODE",
    cardinality: "1:M",
    description: "A schedule contains many PBS items. Every item belongs to exactly one schedule.",
    joinType: "direct",
  },
  {
    from: "items",
    fromField: "PBS_CODE",
    to: "dispensing-rules",
    toField: "PBS_CODE",
    cardinality: "1:M",
    description: "Each PBS item has one or more dispensing rules defining quantities, repeats, and substitution.",
    joinType: "direct",
  },
  {
    from: "items",
    fromField: "PBS_CODE",
    to: "fees",
    toField: "PBS_CODE",
    cardinality: "1:M",
    description: "Each PBS item has associated dispensing fees (pharmacist fee, handling fee, etc.).",
    joinType: "direct",
  },
  {
    from: "items",
    fromField: "PBS_CODE",
    to: "restrictions",
    toField: "PBS_CODE",
    cardinality: "1:M",
    description: "Items may have prescribing restrictions. Unrestricted items have no restriction records.",
    joinType: "direct",
  },
  {
    from: "items",
    fromField: "PBS_CODE",
    to: "item-overview",
    toField: "PBS_CODE",
    cardinality: "1:1",
    description: "item-overview returns a comprehensive nested view of a single item including all related data.",
    joinType: "direct",
  },
  {
    from: "items",
    fromField: "PBS_CODE",
    to: "item-amt",
    toField: "PBS_CODE",
    cardinality: "1:M",
    description: "PBS items map to one or more AMT (Australian Medicines Terminology) concepts.",
    joinType: "direct",
  },
  {
    from: "items",
    fromField: "PROGRAM_CODE",
    to: "programs",
    toField: "PROGRAM_CODE",
    cardinality: "M:1",
    description: "Each item belongs to a PBS program (General Schedule, Repatriation, S100, etc.).",
    joinType: "direct",
  },
  {
    from: "items",
    fromField: "ATC_CODE",
    to: "atc",
    toField: "ATC_CODE",
    cardinality: "M:1",
    description: "Items are classified under ATC (Anatomical Therapeutic Chemical) codes for therapeutic grouping.",
    joinType: "direct",
  },
  {
    from: "restrictions",
    fromField: "RES_CODE",
    to: "parameters",
    toField: "RES_CODE",
    cardinality: "1:M",
    description: "Each restriction has parameters that define groups of conditions to be met.",
    joinType: "direct",
  },
  {
    from: "parameters",
    fromField: "PARAMETER_ID",
    to: "criteria",
    toField: "PARAMETER_ID",
    cardinality: "1:M",
    description: "Each parameter contains specific criteria that must be satisfied.",
    joinType: "direct",
  },
  {
    from: "programs",
    fromField: "PROGRAM_CODE",
    to: "program-dispensing-rules",
    toField: "PROGRAM_CODE",
    cardinality: "1:M",
    description: "Programs can have program-level dispensing rules that apply to all items in the program.",
    joinType: "direct",
  },
  {
    from: "restrictions",
    fromField: "PRESCRIBER_CODE",
    to: "prescribers",
    toField: "PRESCRIBER_CODE",
    cardinality: "M:1",
    description: "Restrictions specify which prescriber types are authorized to prescribe under that restriction.",
    joinType: "direct",
  },
  {
    from: "schedules",
    fromField: "SCHEDULE_CODE",
    to: "summary-of-changes",
    toField: "SCHEDULE_CODE",
    cardinality: "1:M",
    description: "Each schedule has a summary of changes from the previous schedule.",
    joinType: "direct",
  },
  {
    from: "schedules",
    fromField: "SCHEDULE_CODE",
    to: "copayments",
    toField: "SCHEDULE_CODE",
    cardinality: "1:M",
    description: "Copayment amounts are set per schedule (they can change monthly).",
    joinType: "direct",
  },
  {
    from: "schedules",
    fromField: "SCHEDULE_CODE",
    to: "markup-bands",
    toField: "SCHEDULE_CODE",
    cardinality: "1:M",
    description: "Markup band pricing tiers are set per schedule.",
    joinType: "direct",
  },
];

/** Build the relationship map, optionally validating against actual schemas */
export function buildRelationshipMap(
  scheduleCode: string,
  schemas?: Map<PbsEndpointName, EndpointSchema>
): RelationshipMap {
  let relationships = [...KNOWN_RELATIONSHIPS];

  if (schemas) {
    relationships = relationships.filter((rel) => {
      const fromSchema = schemas.get(rel.from);
      const toSchema = schemas.get(rel.to);

      if (!fromSchema || !toSchema) return true; // Keep if we can't validate

      // PBS API uses lowercase field names; our relationship map uses UPPERCASE
      const fromHasField = fromSchema.fields.some((f) => f.name.toLowerCase() === rel.fromField.toLowerCase());
      const toHasField = toSchema.fields.some((f) => f.name.toLowerCase() === rel.toField.toLowerCase());

      if (!fromHasField || !toHasField) {
        console.warn(
          `  ⚠ Relationship ${rel.from}.${rel.fromField} → ${rel.to}.${rel.toField}: field not found in schema, keeping anyway`
        );
      }

      return true;
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    scheduleCode,
    relationships,
  };
}

/** Save the relationship map to disk */
export function saveRelationshipMap(map: RelationshipMap): void {
  fs.mkdirSync(path.dirname(RELATIONSHIPS_PATH), { recursive: true });
  fs.writeFileSync(RELATIONSHIPS_PATH, JSON.stringify(map, null, 2), "utf-8");
  console.log(`Saved ${map.relationships.length} relationships to ${RELATIONSHIPS_PATH}`);
}

/** Load the relationship map from disk */
export function loadRelationshipMap(): RelationshipMap | null {
  if (!fs.existsSync(RELATIONSHIPS_PATH)) return null;
  return JSON.parse(fs.readFileSync(RELATIONSHIPS_PATH, "utf-8"));
}

/** Generate a Mermaid ER diagram from the relationship map */
export function generateMermaidDiagram(map: RelationshipMap): string {
  const lines = ["erDiagram"];

  // Deduplicate endpoints used in relationships
  const entities = new Set<string>();
  for (const rel of map.relationships) {
    entities.add(rel.from);
    entities.add(rel.to);
  }

  // Map cardinality to Mermaid notation
  const cardinalityMap: Record<string, string> = {
    "1:1": "||--||",
    "1:M": "||--o{",
    "M:1": "}o--||",
    "M:M": "}o--o{",
  };

  for (const rel of map.relationships) {
    const mermaidCard = cardinalityMap[rel.cardinality] || "||--o{";
    const fromName = rel.from.replace(/-/g, "_");
    const toName = rel.to.replace(/-/g, "_");
    lines.push(`    ${fromName} ${mermaidCard} ${toName} : "${rel.fromField}"`);
  }

  return lines.join("\n");
}
