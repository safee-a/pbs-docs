import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Handlebars from "handlebars";
import type { EndpointSchema, FieldSchema, RelationshipMap, PbsEndpointName, EndpointMeta } from "../../../pbs-fetcher/src/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEMPLATE_PATH = path.resolve(__dirname, "../templates/endpoint-reference.hbs");
const OUTPUT_DIR = path.resolve(__dirname, "../../../../site/src/content/docs/endpoints");

/** Register Handlebars helpers */
function registerHelpers() {
  Handlebars.registerHelper("firstExample", (values: unknown[]) => {
    if (!values || values.length === 0) return "";
    const val = values[0];
    if (typeof val === "object") return JSON.stringify(val).slice(0, 60);
    return String(val).slice(0, 60);
  });

  Handlebars.registerHelper("lookupNested", (nested: Record<string, FieldSchema[]>, key: string) => {
    return nested[key] || [];
  });

  Handlebars.registerHelper("indexPlusOne", function (this: { index: number }) {
    return this.index + 1;
  });
}

interface EndpointDocContext {
  meta: EndpointMeta;
  schema: EndpointSchema;
  queryExample: string;
  sizeVariant: string;
  nestedKeys: string[];
  relationships: Array<{
    otherEndpoint: string;
    joinField: string;
    cardinality: string;
    description: string;
  }>;
  exampleResponse: string;
}

/** Generate MDX docs for all endpoints that have schemas */
export function generateEndpointDocs(
  endpoints: Record<PbsEndpointName, EndpointMeta>,
  schemas: Map<PbsEndpointName, EndpointSchema>,
  relationshipMap: RelationshipMap
): string[] {
  registerHelpers();

  const templateSrc = fs.readFileSync(TEMPLATE_PATH, "utf-8");
  const template = Handlebars.compile(templateSrc);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const generated: string[] = [];

  for (const [endpointName, meta] of Object.entries(endpoints)) {
    const schema = schemas.get(endpointName as PbsEndpointName);

    // Generate with real schema or a placeholder
    const effectiveSchema: EndpointSchema = schema ?? {
      endpoint: endpointName as PbsEndpointName,
      scheduleCode: "CURRENT",
      fetchedAt: new Date().toISOString(),
      recordCount: 0,
      fields: [],
      nestedStructures: {},
      sampleRecords: [],
    };

    const context = buildContext(meta, effectiveSchema, relationshipMap);
    const mdx = template(context);

    const outPath = path.join(OUTPUT_DIR, `${endpointName}.mdx`);
    fs.writeFileSync(outPath, mdx, "utf-8");
    generated.push(outPath);
    console.log(`  Generated: endpoints/${endpointName}.mdx${schema ? "" : " (metadata only)"}`);
  }

  return generated;
}

function buildContext(
  meta: EndpointMeta,
  schema: EndpointSchema,
  relationshipMap: RelationshipMap
): EndpointDocContext {
  // Build query example
  const queryParts = [`schedule_code=${schema.scheduleCode}`, "limit=5"];
  const queryExample = queryParts.join("&");

  // Size badge variant
  const sizeVariants: Record<string, string> = {
    small: "success",
    medium: "note",
    large: "caution",
    "very-large": "danger",
  };

  // Find relationships for this endpoint
  const relationships = relationshipMap.relationships
    .filter((r) => r.from === meta.name || r.to === meta.name)
    .map((r) => ({
      otherEndpoint: r.from === meta.name ? r.to : r.from,
      joinField: r.from === meta.name ? r.fromField : r.toField,
      cardinality: r.cardinality,
      description: r.description,
    }));

  // Nested structure keys
  const nestedKeys = Object.keys(schema.nestedStructures || {});

  // Example response (first sample record, formatted)
  const exampleResponse =
    schema.sampleRecords.length > 0
      ? JSON.stringify(schema.sampleRecords[0], null, 2)
      : "// No sample data available — run the fetch pipeline to populate";

  return {
    meta,
    schema,
    queryExample,
    sizeVariant: sizeVariants[meta.typicalResponseSize] || "note",
    nestedKeys,
    relationships,
    exampleResponse,
  };
}
