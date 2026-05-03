/* Unified Insight type. Every inbound app's interpretation skill produces
 * an array of these; consumers (weekly-analysis, plan-sitemap) read them.
 *
 * cms/src/lib/types/insight.ts
 *
 * Mirrors the insights table in migration 0003.
 */

import { z } from "zod";

export const InsightConfidence = z.enum(["low", "medium", "high"]);
export type InsightConfidence = z.infer<typeof InsightConfidence>;

/** Base Insight shape. Each app extends `evidence` with its own typed shape
 * via a discriminated union on `type`. */
export const Insight = z.object({
  type: z
    .string()
    .describe(
      "Per-app controlled vocabulary. Examples: 'topic_candidate', 'rising_keyword', 'underconverting_landing_page', 'audience_question'.",
    ),
  title: z
    .string()
    .describe(
      "One-line headline for UI display. Specific, not generic. ~60 chars.",
    ),
  opportunity: z
    .string()
    .describe(
      "1-3 sentences: what this means and what the user should do about it.",
    ),
  evidence: z
    .record(z.string(), z.unknown())
    .describe(
      "Source-specific structured data backing this insight. Free-form JSON; each app's interpretation skill defines what goes here.",
    ),
  confidence: InsightConfidence,
  topic_hint: z
    .string()
    .nullable()
    .describe(
      "If this insight suggests a specific topic that could anchor a pillar, name it here. plan-sitemap reads this to seed new topics. Null when not applicable.",
    ),
  related_keywords: z
    .array(z.string())
    .describe("Keywords involved in this insight. Empty array if none."),
  related_urls: z
    .array(z.string())
    .describe("URLs involved in this insight. Empty array if none."),
  expires_at: z
    .string()
    .nullable()
    .describe(
      "ISO datetime when this insight goes stale. Null = never expires. Use for trending data ('rising in last 30 days').",
    ),
});

export const InsightBatch = z.object({
  summary: z
    .string()
    .describe(
      "Two to three sentences: the headline takeaway from this interpretation run. What stands out across the insights.",
    ),
  insights: z
    .array(Insight)
    .describe("The full set of insights produced by this run."),
});

export type InsightOutput = z.infer<typeof Insight>;
export type InsightBatchOutput = z.infer<typeof InsightBatch>;
