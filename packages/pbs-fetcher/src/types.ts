/** PBS API endpoint names */
export type PbsEndpointName =
  | "schedules"
  | "items"
  | "item-overview"
  | "item-amt"
  | "prescribers"
  | "organisations"
  | "fees"
  | "dispensing-rules"
  | "restrictions"
  | "parameters"
  | "criteria"
  | "copayments"
  | "markup-bands"
  | "programs"
  | "summary-of-changes"
  | "atc"
  | "program-dispensing-rules";

/** Metadata for a single PBS API endpoint */
export interface EndpointMeta {
  name: PbsEndpointName;
  path: string;
  description: string;
  agentDescription: string;
  filterableFields: string[];
  relatedEndpoints: PbsEndpointName[];
  keyFields: string[];
  typicalResponseSize: "small" | "medium" | "large" | "very-large";
  gotchas: string[];
}

/** Inferred field schema from API response analysis */
export interface FieldSchema {
  name: string;
  type: "string" | "number" | "boolean" | "null" | "object" | "array" | "mixed";
  nullable: boolean;
  /** Fraction of records where field is present (0-1) */
  presence: number;
  exampleValues: unknown[];
  /** If this field appears to be a foreign key to another endpoint */
  foreignKeyCandidate?: {
    targetEndpoint: PbsEndpointName;
    targetField: string;
    confidence: "high" | "medium" | "low";
  };
}

/** Analyzed schema for an endpoint's response */
export interface EndpointSchema {
  endpoint: PbsEndpointName;
  scheduleCode: string;
  fetchedAt: string;
  recordCount: number;
  /** Top-level fields in each record */
  fields: FieldSchema[];
  /** Nested object structures */
  nestedStructures: Record<string, FieldSchema[]>;
  /** Raw sample records for documentation examples */
  sampleRecords: unknown[];
}

/** Relationship between two endpoints */
export interface EntityRelationship {
  from: PbsEndpointName;
  fromField: string;
  to: PbsEndpointName;
  toField: string;
  cardinality: "1:1" | "1:M" | "M:1" | "M:M";
  description: string;
  /** How the join is performed — direct FK or via junction */
  joinType: "direct" | "junction";
  junctionEndpoint?: PbsEndpointName;
}

/** Complete relationship map */
export interface RelationshipMap {
  generatedAt: string;
  scheduleCode: string;
  relationships: EntityRelationship[];
}

/** Cache entry metadata */
export interface CacheEntry {
  endpoint: PbsEndpointName;
  scheduleCode: string;
  fetchedAt: string;
  format: "json" | "csv";
  filePath: string;
}

/** PBS API client configuration */
export interface PbsClientConfig {
  baseUrl: string;
  subscriptionKey?: string;
  /** Minimum milliseconds between requests (default: 21000) */
  requestSpacing: number;
  /** Directory for disk cache */
  cacheDir: string;
}

/** PBS API error response */
export interface PbsApiError {
  statusCode: number;
  category: "auth" | "rate-limited" | "not-found" | "bad-request" | "server-error" | "unknown";
  message: string;
  retryable: boolean;
}
