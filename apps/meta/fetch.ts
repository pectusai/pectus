/**
 * fetch.ts — Meta Marketing API fetch for one workspace, one date range.
 *
 * Stub in v1. Real implementation lands in PR6.
 *
 * Uses the Marketing API insights endpoint. Three calls (campaign, ad set, ad
 * level), each paginated, results flattened to MetaAdMetricRow shape.
 *
 * Token refresh is not needed — System User tokens are long-lived. If a token
 * is invalidated, fetch.ts surfaces the auth error verbatim and stops.
 */

import type { MetaFetchResultOutput } from "./schema.js";

export async function fetch(_args: {
  workspaceId: string;
  adAccountId: string;
  since: string;
  until: string;
}): Promise<MetaFetchResultOutput> {
  throw new Error("apps/meta/fetch.ts is stubbed in v1. Implementation in PR6.");
}
