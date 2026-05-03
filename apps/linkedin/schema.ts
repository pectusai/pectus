import { z } from "zod";

export const LinkedInAdMetricLevel = z.enum([
  "campaign_group",
  "campaign",
  "creative",
]);

export const LinkedInAdMetricRow = z.object({
  workspace_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  channel: z.literal("linkedin"),
  level: LinkedInAdMetricLevel,
  entity_id: z.string().describe("LinkedIn URN for the campaign group, campaign, or creative."),
  entity_name: z.string(),
  metric_name: z
    .enum([
      "cost_in_local_currency",
      "impressions",
      "clicks",
      "video_views",
      "video_completions",
      "lead_gen_form_submissions",
      "conversions",
      "conversion_value_in_local_currency",
    ])
    .describe(
      "Canonical metric name. cost_in_local_currency uses the ad account's set currency.",
    ),
  value: z.number(),
  dimensions: z
    .object({
      ad_account_id: z.string().nullable(),
      campaign_group_id: z.string().nullable(),
      campaign_id: z.string().nullable(),
      ad_format: z.string().nullable(),
    })
    .partial(),
});

export const LinkedInFetchResult = z.object({
  workspace_id: z.string().uuid(),
  ad_account_id: z.string(),
  range: z.object({
    since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  rows: z.array(LinkedInAdMetricRow),
  fetched_at: z.string(),
  row_count: z.number().int(),
});

export type LinkedInFetchResultOutput = z.infer<typeof LinkedInFetchResult>;
export type LinkedInAdMetricRowOutput = z.infer<typeof LinkedInAdMetricRow>;
