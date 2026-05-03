import { z } from "zod";

/**
 * Aggregated row used to update the keywords table. One row per query for the
 * configured aggregation window (default last 28 days).
 */
export const KeywordAggregateRow = z.object({
  workspace_id: z.string().uuid(),
  query: z.string().describe("The search query (keyword) the row aggregates."),
  impressions: z.number().int().nonnegative(),
  clicks: z.number().int().nonnegative(),
  position: z
    .number()
    .describe("Average position over the aggregation window. May be fractional."),
  ctr: z.number().min(0).max(1).describe("Calculated as clicks / impressions."),
  window_days: z
    .number()
    .int()
    .positive()
    .describe("How many days the aggregation covers. Default 28."),
});

/**
 * Daily-grain row for the gsc_daily time-series table.
 */
export const GscDailyRow = z.object({
  workspace_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  query: z.string(),
  page: z.string().nullable().describe("URL of the landing page, when available."),
  impressions: z.number().int().nonnegative(),
  clicks: z.number().int().nonnegative(),
  position: z.number(),
});

export const GscFetchResult = z.object({
  workspace_id: z.string().uuid(),
  site_url: z.string().describe("The GSC property that was queried (URL-prefix or sc-domain form)."),
  range: z.object({
    since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  keyword_rows: z
    .array(KeywordAggregateRow)
    .describe("Per-query aggregated rows for the keywords table update."),
  gsc_daily_rows: z
    .array(GscDailyRow)
    .describe("Per-(date, query, page) rows for the gsc_daily time-series table."),
  fetched_at: z.string(),
  keyword_row_count: z.number().int(),
  daily_row_count: z.number().int(),
});

export type GscFetchResultOutput = z.infer<typeof GscFetchResult>;
export type KeywordAggregateRowOutput = z.infer<typeof KeywordAggregateRow>;
export type GscDailyRowOutput = z.infer<typeof GscDailyRow>;
