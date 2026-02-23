import type { EndpointMeta, PbsEndpointName } from "./types.js";

/** Complete catalog of all 17 PBS API v3 endpoints */
export const PBS_ENDPOINTS: Record<PbsEndpointName, EndpointMeta> = {
  schedules: {
    name: "schedules",
    path: "/schedules",
    description: "Lists PBS schedules with effective dates and schedule codes.",
    agentDescription:
      "START HERE. Get the current schedule_code (use get_latest_schedule_only=true). You need this code to filter every other endpoint. Without it, queries return up to 12 months of data.",
    filterableFields: ["schedule_code", "get_latest_schedule_only"],
    relatedEndpoints: ["items", "summary-of-changes"],
    keyFields: ["SCHEDULE_CODE", "EFFECTIVE_DATE"],
    typicalResponseSize: "small",
    gotchas: [
      "Always call with get_latest_schedule_only=true unless you need historical data",
      "SCHEDULE_CODE format is like 'YYYY-MM-01' corresponding to the effective date",
    ],
  },
  items: {
    name: "items",
    path: "/items",
    description: "Core listing of all PBS-listed pharmaceutical items with drug names, PBS codes, pricing, and program info.",
    agentDescription:
      "The main drug listing endpoint. Each record is a unique PBS item (brand+form+strength combination). Filter by schedule_code to get current items. Use PBS_CODE to link to dispensing-rules, fees, and restrictions.",
    filterableFields: [
      "schedule_code",
      "pbs_code",
      "drug_name",
      "li_drug_name",
      "brand_name",
      "program_code",
      "atc_code",
      "item_code",
    ],
    relatedEndpoints: ["item-overview", "item-amt", "dispensing-rules", "fees", "restrictions", "atc", "programs"],
    keyFields: ["PBS_CODE", "ITEM_CODE", "DRUG_NAME", "BRAND_NAME", "SCHEDULE_CODE", "PROGRAM_CODE"],
    typicalResponseSize: "very-large",
    gotchas: [
      "ALWAYS filter by schedule_code — unfiltered returns ~60,000+ records across 12 months",
      "PBS_CODE is not unique across schedules; combine with SCHEDULE_CODE for uniqueness",
      "DRUG_NAME is uppercase; LI_DRUG_NAME is mixed case (preferred for display)",
    ],
  },
  "item-overview": {
    name: "item-overview",
    path: "/item-overview",
    description: "Detailed overview of a specific PBS item including AMT mappings, restrictions, fees, and dispensing rules in a single nested response.",
    agentDescription:
      "Get EVERYTHING about one item in a single call. Returns nested data combining info from items, restrictions, fees, dispensing-rules, and AMT mappings. Use this instead of multiple endpoint calls when you need full detail on one item. Requires pbs_code filter.",
    filterableFields: ["schedule_code", "pbs_code"],
    relatedEndpoints: ["items", "item-amt", "restrictions", "fees", "dispensing-rules"],
    keyFields: ["PBS_CODE"],
    typicalResponseSize: "medium",
    gotchas: [
      "MUST provide pbs_code filter — does not support listing all items",
      "Response has deeply nested structures (restrictions → parameters → criteria)",
      "This is the most efficient single call for complete item data",
    ],
  },
  "item-amt": {
    name: "item-amt",
    path: "/item-amt",
    description: "Maps PBS items to Australian Medicines Terminology (AMT) concepts including TPUUs, MPPs, and TPPs.",
    agentDescription:
      "Links PBS items to AMT (Australian Medicines Terminology) identifiers. Use this to map between PBS codes and AMT concept IDs (TPUU, MPP, TPP). Essential for clinical system integration.",
    filterableFields: ["schedule_code", "pbs_code", "tpuu_code", "mpp_code", "tpp_code"],
    relatedEndpoints: ["items", "item-overview"],
    keyFields: ["PBS_CODE", "TPUU_CODE", "MPP_CODE", "TPP_CODE"],
    typicalResponseSize: "large",
    gotchas: [
      "AMT codes are SNOMED CT-AU identifiers",
      "One PBS item can map to multiple AMT concepts",
    ],
  },
  prescribers: {
    name: "prescribers",
    path: "/prescribers",
    description: "Prescriber type codes and descriptions (e.g., medical practitioners, dentists, optometrists).",
    agentDescription:
      "Reference data for prescriber types. Small dataset. Each item has a restriction linkage showing which prescriber types can prescribe restricted items.",
    filterableFields: ["schedule_code", "prescriber_code"],
    relatedEndpoints: ["restrictions", "items"],
    keyFields: ["PRESCRIBER_CODE", "PRESCRIBER_TYPE"],
    typicalResponseSize: "small",
    gotchas: ["Very small dataset — typically under 20 records"],
  },
  organisations: {
    name: "organisations",
    path: "/organisations",
    description: "Organisation types relevant to PBS prescribing and dispensing.",
    agentDescription:
      "Reference data for organisation types involved in PBS (hospitals, community pharmacies, etc.). Small dataset used in conjunction with dispensing rules.",
    filterableFields: ["schedule_code", "organisation_id"],
    relatedEndpoints: ["dispensing-rules"],
    keyFields: ["ORGANISATION_ID", "ORGANISATION_TYPE"],
    typicalResponseSize: "small",
    gotchas: ["Very small reference dataset"],
  },
  fees: {
    name: "fees",
    path: "/fees",
    description: "Dispensing fees, handling fees, and other fee components for PBS items.",
    agentDescription:
      "Fee schedule for dispensing. Includes pharmacist fees, handling fees, and special pricing. Link to items via fee type codes. Use with copayments to calculate what a patient pays.",
    filterableFields: ["schedule_code", "pbs_code", "dispensing_fee_type_code"],
    relatedEndpoints: ["items", "copayments", "dispensing-rules"],
    keyFields: ["PBS_CODE", "DISPENSING_FEE_TYPE_CODE", "FEE_AMOUNT"],
    typicalResponseSize: "large",
    gotchas: [
      "Fee amounts are in AUD cents in some fields — check field descriptions",
      "Multiple fee records per item (different fee types)",
    ],
  },
  "dispensing-rules": {
    name: "dispensing-rules",
    path: "/dispensing-rules",
    description: "Rules governing how PBS items can be dispensed including quantities, repeats, and substitution rules.",
    agentDescription:
      "Dispensing constraints for each PBS item: max quantity, number of repeats, brand substitution permitted, etc. Essential for understanding how a prescription can be filled.",
    filterableFields: ["schedule_code", "pbs_code"],
    relatedEndpoints: ["items", "fees", "program-dispensing-rules"],
    keyFields: ["PBS_CODE", "MAX_QUANTITY", "NUMBER_OF_REPEATS", "BRAND_SUBSTITUTION_PERMITTED"],
    typicalResponseSize: "large",
    gotchas: [
      "Dispensing rules vary by program — check PROGRAM_CODE",
      "BRAND_SUBSTITUTION_PERMITTED is a key field for generic substitution queries",
    ],
  },
  restrictions: {
    name: "restrictions",
    path: "/restrictions",
    description: "Prescribing restrictions that apply to PBS items, defining when and how items can be prescribed under the PBS.",
    agentDescription:
      "PBS items can have Authority Required, Restricted, or Unrestricted status. This endpoint lists the restriction rules. Each restriction has parameters (conditions) and criteria (specific requirements). Navigate: restriction → parameters → criteria.",
    filterableFields: ["schedule_code", "pbs_code", "res_code"],
    relatedEndpoints: ["items", "parameters", "criteria", "prescribers"],
    keyFields: ["RES_CODE", "PBS_CODE", "RESTRICTION_TEXT", "AUTHORITY_METHOD"],
    typicalResponseSize: "very-large",
    gotchas: [
      "Restriction text can be very long — it contains clinical criteria",
      "AUTHORITY_METHOD values: WRITTEN, PHONE, ELECTRONIC, STREAMLINED",
      "One item can have multiple restrictions (different clinical indications)",
    ],
  },
  parameters: {
    name: "parameters",
    path: "/parameters",
    description: "Parameters within a restriction that define specific conditions or requirements.",
    agentDescription:
      "Middle tier of the restriction hierarchy: restriction → parameters → criteria. Parameters group related criteria within a restriction. Link via RES_CODE to restrictions and PARAMETER_ID to criteria.",
    filterableFields: ["schedule_code", "res_code", "parameter_id"],
    relatedEndpoints: ["restrictions", "criteria"],
    keyFields: ["PARAMETER_ID", "RES_CODE", "PARAMETER_TEXT"],
    typicalResponseSize: "very-large",
    gotchas: [
      "Large dataset — always filter by res_code or schedule_code",
      "Parameters are ordered — PARAMETER_SEQUENCE matters",
    ],
  },
  criteria: {
    name: "criteria",
    path: "/criteria",
    description: "Specific criteria within a parameter that must be met for a restriction to be satisfied.",
    agentDescription:
      "Leaf tier of restriction hierarchy: restriction → parameters → criteria. Each criterion is a specific condition (e.g., 'Patient has tried and failed drug X'). Link via PARAMETER_ID to parameters.",
    filterableFields: ["schedule_code", "parameter_id", "criteria_id"],
    relatedEndpoints: ["parameters", "restrictions"],
    keyFields: ["CRITERIA_ID", "PARAMETER_ID", "CRITERIA_TEXT"],
    typicalResponseSize: "very-large",
    gotchas: [
      "Very large dataset — never fetch without filters",
      "CRITERIA_TEXT contains the actual clinical requirement text",
    ],
  },
  copayments: {
    name: "copayments",
    path: "/copayments",
    description: "Patient copayment amounts and safety net thresholds for different patient categories.",
    agentDescription:
      "What patients pay out of pocket. Includes general and concessional copayment amounts, safety net thresholds, and price tiers. Key to answering 'what does this cost the patient?' queries.",
    filterableFields: ["schedule_code"],
    relatedEndpoints: ["fees", "items"],
    keyFields: ["PATIENT_CATEGORY", "COPAYMENT_AMOUNT", "SAFETY_NET_THRESHOLD"],
    typicalResponseSize: "small",
    gotchas: [
      "Amounts change with each schedule — always use current schedule_code",
      "Two main categories: General and Concessional patients",
    ],
  },
  "markup-bands": {
    name: "markup-bands",
    path: "/markup-bands",
    description: "Wholesale markup band percentages used in PBS pricing calculations.",
    agentDescription:
      "Pricing reference data showing markup percentages applied at different price bands. Used in the PBS pricing formula to calculate the dispensed price from the ex-manufacturer price.",
    filterableFields: ["schedule_code"],
    relatedEndpoints: ["fees", "items"],
    keyFields: ["BAND_NUMBER", "MARKUP_PERCENTAGE", "UPPER_LIMIT"],
    typicalResponseSize: "small",
    gotchas: ["Small reference dataset that changes infrequently"],
  },
  programs: {
    name: "programs",
    path: "/programs",
    description: "PBS programs (General Schedule, Repatriation, Section 100 schemes) under which items are listed.",
    agentDescription:
      "Reference data for PBS program types. Items belong to programs like General Schedule (GE), Repatriation (RP), or Section 100 schemes (various codes). Use PROGRAM_CODE to filter items by program.",
    filterableFields: ["schedule_code", "program_code"],
    relatedEndpoints: ["items", "program-dispensing-rules"],
    keyFields: ["PROGRAM_CODE", "PROGRAM_DESCRIPTION"],
    typicalResponseSize: "small",
    gotchas: [
      "Key programs: GE (General), RP (Repatriation), HB (Highly Specialised Drugs), CA (Chemotherapy)",
      "Some items appear under multiple programs with different conditions",
    ],
  },
  "summary-of-changes": {
    name: "summary-of-changes",
    path: "/summary-of-changes",
    description: "Summary of what changed between PBS schedules — new listings, delistings, price changes.",
    agentDescription:
      "Monthly changelog. Shows what was added, removed, or modified between consecutive schedules. Essential for tracking PBS updates. Filter by schedule_code to see changes for that month.",
    filterableFields: ["schedule_code", "change_type"],
    relatedEndpoints: ["schedules", "items"],
    keyFields: ["CHANGE_TYPE", "PBS_CODE", "DRUG_NAME", "CHANGE_DESCRIPTION"],
    typicalResponseSize: "medium",
    gotchas: [
      "Changes reference the schedule they appear IN (not the previous one)",
      "CHANGE_TYPE values vary — check actual responses for current values",
    ],
  },
  atc: {
    name: "atc",
    path: "/atc",
    description: "Anatomical Therapeutic Chemical (ATC) classification codes for PBS items.",
    agentDescription:
      "WHO ATC drug classification hierarchy. Maps items to therapeutic categories (e.g., C09AA02 = enalapril under ACE inhibitors). Use to find all drugs in a therapeutic class. Link to items via ATC_CODE.",
    filterableFields: ["schedule_code", "atc_code", "atc_level"],
    relatedEndpoints: ["items"],
    keyFields: ["ATC_CODE", "ATC_LEVEL", "ATC_DESCRIPTION"],
    typicalResponseSize: "medium",
    gotchas: [
      "ATC has 5 levels: anatomical (1 char), therapeutic (3 char), pharmacological (4 char), chemical (5 char), substance (7 char)",
      "Items link to ATC via atc_code field, with ATC_PRIORITY_PCT for primary classification",
    ],
  },
  "program-dispensing-rules": {
    name: "program-dispensing-rules",
    path: "/program-dispensing-rules",
    description: "Dispensing rules that apply at the program level rather than individual item level.",
    agentDescription:
      "Program-wide dispensing rules that override or supplement item-level dispensing rules. Check these when dispensing rules for an item seem incomplete — the program may set defaults.",
    filterableFields: ["schedule_code", "program_code"],
    relatedEndpoints: ["programs", "dispensing-rules"],
    keyFields: ["PROGRAM_CODE", "RULE_TYPE", "RULE_VALUE"],
    typicalResponseSize: "small",
    gotchas: [
      "These rules apply to ALL items in a program unless overridden at item level",
      "Check both item-level and program-level rules for complete picture",
    ],
  },
};

/** Get all endpoint names */
export function getAllEndpointNames(): PbsEndpointName[] {
  return Object.keys(PBS_ENDPOINTS) as PbsEndpointName[];
}

/** Get endpoint metadata by name */
export function getEndpointMeta(name: PbsEndpointName): EndpointMeta {
  return PBS_ENDPOINTS[name];
}
