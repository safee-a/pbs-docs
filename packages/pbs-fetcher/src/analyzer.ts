import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { EndpointSchema, FieldSchema, PbsEndpointName } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { getAllEndpointNames, PBS_ENDPOINTS } from "./endpoints.js";
import { PbsClient } from "./client.js";

const SCHEMAS_DIR = path.resolve(__dirname, "../data/schemas");
const MAX_SAMPLE_VALUES = 5;
const MAX_SAMPLE_RECORDS = 3;

/** Analyze response structures for all endpoints */
export async function analyzeAllEndpoints(
  client: PbsClient,
  scheduleCode: string
): Promise<Map<PbsEndpointName, EndpointSchema>> {
  const schemas = new Map<PbsEndpointName, EndpointSchema>();

  fs.mkdirSync(SCHEMAS_DIR, { recursive: true });

  for (const endpointName of getAllEndpointNames()) {
    console.log(`Analyzing: ${endpointName}...`);
    try {
      const schema = await analyzeEndpoint(client, endpointName, scheduleCode);
      schemas.set(endpointName, schema);

      // Write schema to disk
      const outPath = path.join(SCHEMAS_DIR, `${endpointName}.json`);
      fs.writeFileSync(outPath, JSON.stringify(schema, null, 2), "utf-8");
      console.log(`  → ${schema.fields.length} fields, ${schema.recordCount} records`);
    } catch (err) {
      console.error(`  ✗ Failed to analyze ${endpointName}:`, err instanceof Error ? err.message : err);
    }
  }

  return schemas;
}

/** Analyze a single endpoint's response structure */
async function analyzeEndpoint(
  client: PbsClient,
  endpoint: PbsEndpointName,
  scheduleCode: string
): Promise<EndpointSchema> {
  const params: Record<string, string> = {
    schedule_code: scheduleCode,
    limit: "100",
  };

  // item-overview requires pbs_code — skip for bulk analysis; we'll handle it separately
  if (endpoint === "item-overview") {
    // Fetch a known item first to get a pbs_code
    const { data: itemsData } = await client.fetchEndpoint("items", {
      schedule_code: scheduleCode,
      limit: "1",
    });
    const items = itemsData as Array<Record<string, unknown>>;
    if (items.length > 0 && items[0].PBS_CODE) {
      params.pbs_code = String(items[0].PBS_CODE);
      delete params.limit; // item-overview returns one item
    }
  }

  const { data } = await client.fetchEndpoint(endpoint, params);
  const records = Array.isArray(data) ? data : [data];

  const fields = analyzeFields(records as Array<Record<string, unknown>>);
  const nestedStructures = analyzeNestedStructures(records as Array<Record<string, unknown>>);

  return {
    endpoint,
    scheduleCode,
    fetchedAt: new Date().toISOString(),
    recordCount: records.length,
    fields,
    nestedStructures,
    sampleRecords: records.slice(0, MAX_SAMPLE_RECORDS),
  };
}

/** Analyze top-level fields across multiple records */
function analyzeFields(records: Array<Record<string, unknown>>): FieldSchema[] {
  if (records.length === 0) return [];

  const fieldMap = new Map<string, { values: unknown[]; presentCount: number }>();

  for (const record of records) {
    for (const [key, value] of Object.entries(record)) {
      if (!fieldMap.has(key)) {
        fieldMap.set(key, { values: [], presentCount: 0 });
      }
      const entry = fieldMap.get(key)!;
      if (value !== null && value !== undefined) {
        entry.presentCount++;
        if (entry.values.length < MAX_SAMPLE_VALUES) {
          // Avoid duplicate examples
          const strVal = JSON.stringify(value);
          if (!entry.values.some((v) => JSON.stringify(v) === strVal)) {
            entry.values.push(value);
          }
        }
      }
    }
  }

  return Array.from(fieldMap.entries()).map(([name, { values, presentCount }]) => ({
    name,
    type: inferType(values),
    nullable: presentCount < records.length,
    presence: records.length > 0 ? presentCount / records.length : 0,
    exampleValues: values.slice(0, MAX_SAMPLE_VALUES),
  }));
}

/** Detect and analyze nested object/array structures */
function analyzeNestedStructures(
  records: Array<Record<string, unknown>>
): Record<string, FieldSchema[]> {
  const nested: Record<string, FieldSchema[]> = {};

  for (const record of records) {
    for (const [key, value] of Object.entries(record)) {
      if (key in nested) continue; // Already analyzed

      if (Array.isArray(value) && value.length > 0 && typeof value[0] === "object" && value[0] !== null) {
        nested[key] = analyzeFields(value as Array<Record<string, unknown>>);
      } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        nested[key] = analyzeFields([value as Record<string, unknown>]);
      }
    }
  }

  return nested;
}

/** Infer the type of a field from sample values */
function inferType(values: unknown[]): FieldSchema["type"] {
  if (values.length === 0) return "null";

  const types = new Set(values.map((v) => {
    if (v === null || v === undefined) return "null";
    if (Array.isArray(v)) return "array";
    return typeof v as "string" | "number" | "boolean" | "object";
  }));

  if (types.size === 1) return types.values().next().value as FieldSchema["type"];
  if (types.size === 2 && types.has("null")) {
    types.delete("null");
    return types.values().next().value as FieldSchema["type"];
  }
  return "mixed";
}

/** Detect foreign key candidates by matching field names across endpoint schemas */
export function detectForeignKeys(
  schemas: Map<PbsEndpointName, EndpointSchema>
): void {
  // Build a map of primary key fields per endpoint (lowercase for matching)
  const pkMap = new Map<string, { endpoint: PbsEndpointName; originalName: string }>();
  for (const [endpointName, meta] of Object.entries(PBS_ENDPOINTS)) {
    for (const keyField of meta.keyFields) {
      pkMap.set(keyField.toLowerCase(), {
        endpoint: endpointName as PbsEndpointName,
        originalName: keyField,
      });
    }
  }

  // Check each schema's fields for FK candidates (case-insensitive)
  for (const [endpointName, schema] of schemas) {
    for (const field of schema.fields) {
      const match = pkMap.get(field.name.toLowerCase());
      if (match && match.endpoint !== endpointName) {
        field.foreignKeyCandidate = {
          targetEndpoint: match.endpoint,
          targetField: match.originalName,
          confidence: "high",
        };
      }
    }
  }
}

/** Load previously saved schemas from disk */
export function loadSavedSchemas(): Map<PbsEndpointName, EndpointSchema> {
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
