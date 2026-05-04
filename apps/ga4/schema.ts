import { z } from "zod";

export const AnalyticsRow = z.object({
  project_id: z.string().uuid(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe("ISO date the metric is reported for."),
  metric_name: z
    .enum([
      "sessions",
      "total_users",
      "new_users",
      "pageviews",
      "screen_views",
      "avg_engagement_time_seconds",
      "conversions",
      "engaged_sessions",
    ])
    .describe("Canonical metric name. Mapped from GA4 metric IDs by fetch.ts."),
  value: z.number().describe("Numeric value of the metric for this date and dimension set."),
  dimensions: z
    .object({
      page_path: z.string().nullable(),
      source: z.string().nullable(),
      medium: z.string().nullable(),
      campaign: z.string().nullable(),
      country: z.string().nullable(),
    })
    .partial()
    .describe(
      "Optional dimensions the metric is broken down by. Null fields mean 'aggregated across this dimension'.",
    ),
});

export const Ga4FetchResult = z.object({
  project_id: z.string().uuid(),
  property_id: z.string().describe("GA4 property ID that was queried."),
  range: z.object({
    since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  rows: z.array(AnalyticsRow).describe("Flattened rows ready for insertion into analytics_metrics."),
  fetched_at: z.string().describe("ISO timestamp the fetch completed."),
  row_count: z.number().int(),
});

export type Ga4FetchResultOutput = z.infer<typeof Ga4FetchResult>;
export type AnalyticsRowOutput = z.infer<typeof AnalyticsRow>;
