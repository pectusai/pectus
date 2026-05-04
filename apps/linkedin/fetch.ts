/**
 * fetch.ts — LinkedIn Marketing API fetch for one project, one date range.
 *
 * Stub in v1. Real implementation lands in PR6.
 *
 * Uses the adAnalytics endpoint with pivot=CAMPAIGN_GROUP, CAMPAIGN, CREATIVE
 * (three calls, one per level). Refreshes the access token via
 * LINKEDIN_REFRESH_TOKEN if the cached access token is expired or missing.
 * Flattens results to LinkedInAdMetricRow shape.
 */

import type { LinkedInFetchResultOutput } from "./schema.js";

export async function fetch(_args: {
  projectId: string;
  adAccountId: string;
  since: string;
  until: string;
}): Promise<LinkedInFetchResultOutput> {
  throw new Error("apps/linkedin/fetch.ts is stubbed in v1. Implementation in PR6.");
}
