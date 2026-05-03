import { z } from "zod";

export const MetaAdMetricLevel = z.enum(["campaign", "ad_set", "ad"]);

export const MetaAdMetricRow = z.object({
  workspace_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  channel: z.literal("meta"),
  level: MetaAdMetricLevel,
  entity_id: z.string().describe("Meta ID for campaign, ad set, or ad."),
  entity_name: z.string(),
  metric_name: z
    .enum([
      "spend",
      "impressions",
      "reach",
      "clicks",
      "link_clicks",
      "purchases",
      "purchases_value",
      "leads",
      "signups",
      "app_installs",
    ])
    .describe("Canonical metric name. Spend is in account currency, not micros."),
  value: z.number(),
  dimensions: z
    .object({
      ad_account_id: z.string().nullable(),
      campaign_id: z.string().nullable(),
      ad_set_id: z.string().nullable(),
      placement: z.string().nullable(),
      platform: z.string().nullable(),
    })
    .partial(),
});

export const MetaFetchResult = z.object({
  workspace_id: z.string().uuid(),
  ad_account_id: z.string(),
  range: z.object({
    since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  rows: z.array(MetaAdMetricRow),
  fetched_at: z.string(),
  row_count: z.number().int(),
});

export type MetaFetchResultOutput = z.infer<typeof MetaFetchResult>;
export type MetaAdMetricRowOutput = z.infer<typeof MetaAdMetricRow>;
