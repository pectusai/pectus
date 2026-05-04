import { z } from "zod";

export const AdMetricLevel = z.enum(["campaign", "ad_group", "keyword"]);

export const AdMetricRow = z.object({
  project_id: z.string().uuid(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe("ISO date the metric is reported for."),
  channel: z.literal("google_ads"),
  level: AdMetricLevel,
  entity_id: z.string().describe("The Google Ads ID for the campaign, ad group, or keyword."),
  entity_name: z.string().describe("Human-readable name. Useful for UIs."),
  metric_name: z
    .enum([
      "cost_micros",
      "clicks",
      "impressions",
      "conversions",
      "conversions_value",
      "search_impression_share",
      "search_lost_is_budget",
      "search_lost_is_rank",
      "quality_score",
    ])
    .describe("Canonical metric name. cost_micros is in micros (divide by 1e6 for currency)."),
  value: z.number(),
  dimensions: z
    .object({
      customer_id: z.string().nullable(),
      campaign_id: z.string().nullable(),
      ad_group_id: z.string().nullable(),
      device: z.string().nullable(),
      network: z.string().nullable(),
    })
    .partial(),
});

export const GoogleAdsFetchResult = z.object({
  project_id: z.string().uuid(),
  customer_id: z.string(),
  range: z.object({
    since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  rows: z.array(AdMetricRow),
  fetched_at: z.string(),
  row_count: z.number().int(),
});

export type GoogleAdsFetchResultOutput = z.infer<typeof GoogleAdsFetchResult>;
export type AdMetricRowOutput = z.infer<typeof AdMetricRow>;
