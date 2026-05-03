/**
 * fetch.ts — Google Ads API fetch for one workspace, one date range.
 *
 * Stub in v1. Real implementation lands in PR6.
 *
 * Uses the Google Ads REST API (v17 at time of writing). Auth is OAuth +
 * developer token. Fetches at three levels (campaign, ad group, keyword) in
 * separate GAQL queries, flattens to AdMetricRow shape, returns for runner
 * to insert into ad_metrics.
 */

import type { GoogleAdsFetchResultOutput } from "./schema.js";

export async function fetch(_args: {
  workspaceId: string;
  customerId: string;
  since: string;
  until: string;
}): Promise<GoogleAdsFetchResultOutput> {
  throw new Error("apps/google-ads/fetch.ts is stubbed in v1. Implementation in PR6.");
}
