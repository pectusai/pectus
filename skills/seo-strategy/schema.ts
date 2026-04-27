import { z } from "zod";

export const KeywordCluster = z.object({
  cluster_name: z.string().describe("Short, descriptive name for the cluster."),
  intent: z.enum([
    "informational",
    "commercial_investigation",
    "transactional",
    "navigational",
    "job_seeker",
    "technical",
  ]),
  keywords: z.array(z.string()).describe("All keywords from the input list that belong here."),
  aggregate_volume: z.number().int().nullable(),
  aggregate_impressions: z.number().int().nullable(),
});

export const SitemapMatch = z.object({
  cluster_name: z.string(),
  matching_urls: z.array(
    z.object({
      url: z.string(),
      match_type: z.enum(["direct", "indirect", "body"]),
      confidence: z.enum(["high", "medium", "low"]),
    }),
  ),
  coverage: z.enum(["covered", "partial", "missing"]),
});

export const Gap = z.object({
  cluster_name: z.string(),
  rank: z.number().int().describe("1 = highest priority gap."),
  reason: z.string().describe("Why this gap is high priority — volume, intent, business value."),
  recommended_format: z.string().describe("Pillar page, comparison post, listicle, etc."),
  example_topics: z.array(z.string()).describe("3-5 concrete article topics that would fill the gap."),
});

export const SeoStrategy = z.object({
  keyword_clusters: z.array(KeywordCluster).min(5).max(20),
  sitemap_diff: z.array(SitemapMatch),
  gap_report: z.array(Gap).max(20),
});

export type SeoStrategyOutput = z.infer<typeof SeoStrategy>;
