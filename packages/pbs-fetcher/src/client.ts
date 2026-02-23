import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PbsClientConfig, PbsApiError, PbsEndpointName } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_BASE_URL = "https://data-api.health.gov.au/pbs/api/v3";
const DEFAULT_SUBSCRIPTION_KEY = "2384af7c667342ceb5a736fe29f1dc6b"; // Public API default key
const DEFAULT_REQUEST_SPACING = 21_000; // 21 seconds (20s rate limit + 1s buffer)

export class PbsClient {
  private config: PbsClientConfig;
  private lastRequestTime = 0;
  private requestQueue: Array<() => Promise<void>> = [];
  private processing = false;

  constructor(config?: Partial<PbsClientConfig>) {
    this.config = {
      baseUrl: config?.baseUrl || process.env.PBS_API_BASE_URL || DEFAULT_BASE_URL,
      subscriptionKey: config?.subscriptionKey || process.env.PBS_SUBSCRIPTION_KEY || DEFAULT_SUBSCRIPTION_KEY,
      requestSpacing: config?.requestSpacing ?? DEFAULT_REQUEST_SPACING,
      cacheDir: config?.cacheDir || path.resolve(__dirname, "../data/cache"),
    };
    fs.mkdirSync(this.config.cacheDir, { recursive: true });
  }

  /** Fetch JSON from a PBS API endpoint with rate limiting and caching */
  async fetchEndpoint(
    endpoint: PbsEndpointName,
    params: Record<string, string> = {},
    options: { format?: "json" | "csv"; bypassCache?: boolean } = {}
  ): Promise<{ data: unknown; meta: unknown; fromCache: boolean }> {
    const format = options.format ?? "json";
    const cacheKey = this.buildCacheKey(endpoint, params, format);
    const cachePath = path.join(this.config.cacheDir, cacheKey);

    // Check disk cache
    if (!options.bypassCache && fs.existsSync(cachePath)) {
      const cached = fs.readFileSync(cachePath, "utf-8");
      if (format === "json") {
        const parsed = JSON.parse(cached);
        return { data: parsed.data ?? parsed, meta: parsed._meta, fromCache: true };
      }
      return { data: cached, meta: null, fromCache: true };
    }

    // Build URL
    const url = new URL(`${this.config.baseUrl}/${endpoint}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    // Rate-limited fetch
    const response = await this.rateLimitedFetch(url.toString(), format);

    // Cache the full response to disk
    const dataStr = typeof response === "string" ? response : JSON.stringify(response, null, 2);
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    fs.writeFileSync(cachePath, dataStr, "utf-8");

    // Extract data array from PBS API response envelope { _meta, _links, data }
    if (format === "json" && typeof response === "object" && response !== null) {
      const envelope = response as Record<string, unknown>;
      return { data: envelope.data ?? response, meta: envelope._meta, fromCache: false };
    }

    return { data: response, meta: null, fromCache: false };
  }

  /** Get the latest schedule code */
  async getLatestScheduleCode(): Promise<string> {
    const { data } = await this.fetchEndpoint("schedules", {
      get_latest_schedule_only: "true",
    });
    const schedules = data as Array<Record<string, unknown>>;
    if (!Array.isArray(schedules) || schedules.length === 0) {
      throw new Error("No schedules returned from PBS API");
    }
    // PBS API uses lowercase field names; schedule_code is a numeric ID
    return String(schedules[0].schedule_code ?? schedules[0].SCHEDULE_CODE);
  }

  private async rateLimitedFetch(url: string, format: "json" | "csv"): Promise<unknown> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await this.executeRequest(url, format);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.requestQueue.length > 0) {
      const elapsed = Date.now() - this.lastRequestTime;
      const waitTime = Math.max(0, this.config.requestSpacing - elapsed);

      if (waitTime > 0) {
        console.log(`  Rate limit: waiting ${(waitTime / 1000).toFixed(1)}s...`);
        await this.sleep(waitTime);
      }

      const task = this.requestQueue.shift();
      if (task) {
        this.lastRequestTime = Date.now();
        await task();
      }
    }

    this.processing = false;
  }

  private async executeRequest(url: string, format: "json" | "csv"): Promise<unknown> {
    const headers: Record<string, string> = {
      Accept: format === "csv" ? "text/csv" : "application/json",
    };

    if (this.config.subscriptionKey) {
      headers["subscription-key"] = this.config.subscriptionKey;
    }

    console.log(`  Fetching: ${url}`);
    const response = await fetch(url, { headers });

    if (!response.ok) {
      const error = this.categorizeError(response.status, await response.text());
      throw error;
    }

    return format === "csv" ? response.text() : response.json();
  }

  private categorizeError(status: number, body: string): PbsApiError {
    const categories: Record<number, PbsApiError["category"]> = {
      401: "auth",
      403: "auth",
      429: "rate-limited",
      404: "not-found",
      400: "bad-request",
      415: "bad-request",
    };

    return {
      statusCode: status,
      category: categories[status] ?? (status >= 500 ? "server-error" : "unknown"),
      message: `PBS API ${status}: ${body.slice(0, 200)}`,
      retryable: status === 429 || status >= 500,
    };
  }

  private buildCacheKey(endpoint: PbsEndpointName, params: Record<string, string>, format: string): string {
    const paramStr = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("&");
    return `${endpoint}/${paramStr || "default"}.${format}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
