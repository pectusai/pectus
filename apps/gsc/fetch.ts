/**
 * fetch.ts — GSC API fetch for one workspace, one date range.
 *
 * Stub in v1. Real implementation lands in PR6.
 *
 * Auth via @pectus/google/service-account (shared credential). API client
 * functions already live in connectors/google/gsc.ts (fetchGscQueryRows etc).
 * This module orchestrates the calls at two grains and shapes the results.
 *
 * Returns a GscFetchResult matching ./schema.ts. The runner upserts
 * keyword_rows into keywords (matching on workspace_id + query) and inserts
 * gsc_daily_rows into gsc_daily.
 */

import type { GscFetchResultOutput } from "./schema.js";

export async function fetch(_args: {
  workspaceId: string;
  siteUrl: string;
  since: string;
  until: string;
}): Promise<GscFetchResultOutput> {
  throw new Error("apps/gsc/fetch.ts is stubbed in v1. Implementation in PR6.");
}
