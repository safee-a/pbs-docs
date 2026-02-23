import { fetchAndParsePsd, type FetchedPsd } from "../utils/psd-fetcher.js";

export interface GetDecisionInput {
  path: string;
}

/**
 * Fetch and parse a specific PBAC PSD on demand.
 * This is slow (~3-5 seconds) — involves 3 HTTP requests + docx parsing.
 */
export async function getDecision(
  input: GetDecisionInput
): Promise<FetchedPsd> {
  return fetchAndParsePsd(input.path);
}
