import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { EndpointSchema, EndpointMeta, PbsEndpointName, FieldSchema } from "../../../pbs-fetcher/src/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const OUTPUT_PATH = path.resolve(__dirname, "../../../../site/public/schemas/pbs-api-tools.json");

/** Generate OpenAPI 3.1 schema for all PBS API endpoints */
export function generateOpenApiSchema(
  endpoints: Record<PbsEndpointName, EndpointMeta>,
  schemas: Map<PbsEndpointName, EndpointSchema>
): void {
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });

  const openApi = {
    openapi: "3.1.0",
    info: {
      title: "PBS API v3",
      description:
        "Australian Pharmaceutical Benefits Scheme API. Provides access to PBS schedule data including drug listings, pricing, restrictions, and dispensing rules.",
      version: "3.6.5",
      contact: {
        name: "Department of Health and Aged Care",
        url: "https://data-api.health.gov.au",
      },
    },
    servers: [
      {
        url: "https://data-api.health.gov.au/pbs/api/v3",
        description: "PBS API v3 Production",
      },
    ],
    paths: {} as Record<string, unknown>,
    components: {
      schemas: {} as Record<string, unknown>,
      parameters: {
        scheduleCode: {
          name: "schedule_code",
          in: "query",
          description: "PBS schedule code (e.g., 2026-02-01). Always include to limit results to a single schedule.",
          schema: { type: "string", example: "2026-02-01" },
        },
        limit: {
          name: "limit",
          in: "query",
          description: "Maximum number of records to return.",
          schema: { type: "integer", minimum: 1 },
        },
      },
    },
  };

  for (const [endpointName, meta] of Object.entries(endpoints)) {
    const schema = schemas.get(endpointName as PbsEndpointName);
    const operationId = endpointName.replace(/-/g, "_");

    // Build path parameters
    const parameters: unknown[] = [
      { $ref: "#/components/parameters/scheduleCode" },
      { $ref: "#/components/parameters/limit" },
    ];

    for (const field of meta.filterableFields) {
      if (field === "schedule_code") continue;
      parameters.push({
        name: field,
        in: "query",
        description: `Filter by ${field}`,
        schema: { type: "string" },
      });
    }

    // Build response schema
    const responseSchema = schema
      ? buildResponseSchema(endpointName as PbsEndpointName, schema)
      : { type: "array", items: { type: "object" } };

    // Store component schema
    const schemaName = `${operationId}_response`;
    openApi.components.schemas[schemaName] = responseSchema;

    openApi.paths[`/${endpointName}`] = {
      get: {
        operationId: `get_${operationId}`,
        summary: meta.description,
        description: meta.agentDescription,
        parameters,
        responses: {
          "200": {
            description: "Successful response",
            content: {
              "application/json": {
                schema: { $ref: `#/components/schemas/${schemaName}` },
              },
            },
          },
          "401": { description: "Unauthorized — invalid or missing subscription key" },
          "429": { description: "Rate limited — exceeded 1 request per 20 seconds" },
        },
      },
    };
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(openApi, null, 2), "utf-8");
  console.log(`  Generated: schemas/pbs-api-tools.json`);
}

function buildResponseSchema(
  endpointName: PbsEndpointName,
  schema: EndpointSchema
): Record<string, unknown> {
  const properties: Record<string, unknown> = {};

  for (const field of schema.fields) {
    properties[field.name] = fieldToJsonSchema(field);
  }

  const itemSchema: Record<string, unknown> = {
    type: "object",
    properties,
  };

  // For item-overview, it's a single object not an array
  if (endpointName === "item-overview") {
    return itemSchema;
  }

  return {
    type: "array",
    items: itemSchema,
  };
}

function fieldToJsonSchema(field: FieldSchema): Record<string, unknown> {
  const typeMap: Record<string, string> = {
    string: "string",
    number: "number",
    boolean: "boolean",
    null: "null",
    object: "object",
    array: "array",
    mixed: "string",
  };

  const schema: Record<string, unknown> = {
    type: typeMap[field.type] || "string",
  };

  if (field.nullable) {
    schema.nullable = true;
  }

  if (field.exampleValues.length > 0) {
    const example = field.exampleValues[0];
    if (typeof example !== "object") {
      schema.example = example;
    }
  }

  return schema;
}
