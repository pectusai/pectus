/**
 * fetch.ts — GA4 Data API fetch for one project, one date range.
 *
 * Stub in v1. Real implementation lands in PR6.
 *
 * Auth via @pectus/google/service-account (shared credential set up by
 * `npx pectus connect google`). Uses the BetaAnalyticsData runReport endpoint.
 *
 * Returns an Ga4FetchResult matching ./schema.ts. The runner inserts the rows
 * into analytics_metrics and writes a row to app_runs for observability.
 */

import type { Ga4FetchResultOutput } from "./schema.js";

export async function fetch(_args: {
  projectId: string;
  propertyId: string;
  since: string;
  until: string;
}): Promise<Ga4FetchResultOutput> {
  throw new Error("apps/ga4/fetch.ts is stubbed in v1. Implementation in PR6.");
}
