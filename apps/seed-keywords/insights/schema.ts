import { z } from "zod";

/* seed-keywords interpretation output. Extends the base Insight schema with
 * a controlled `type` vocabulary specific to this app. The base `evidence`
 * remains a free-form record so each type can carry its own structured data
 * without forcing the consumer to know about it.
 *
 * Mirrors cms/src/lib/types/insight.ts but lives here so the skill is
 * self-contained — the runner reads schema.ts via the cms registry. */

const SeedKeywordsInsightType = z.enum([
  "topic_candidate",
  "intent_gap",
  "audience_alignment",
  "weak_signal",
]);

const SeedKeywordsInsight = z.object({
  type: SeedKeywordsInsightType,
  title: z.string().describe("One-line headline. Specific, ~60 chars."),
  opportunity: z
    .string()
    .describe("1-3 sentences: what this means and what to do about it."),
  evidence: z
    .record(z.string(), z.unknown())
    .describe(
      "Per-type evidence. For topic_candidate: { cluster_keywords: string[], dominant_intent: string }. For intent_gap: { missing_intents: string[] }. For audience_alignment: { persona: string, painpoint: string }. For weak_signal: { reason: string }.",
    ),
  confidence: z.enum(["low", "medium", "high"]),
  topic_hint: z
    .string()
    .nullable()
    .describe(
      "If this insight suggests a specific topic that could anchor a pillar, name it here. Always set on topic_candidate; otherwise null.",
    ),
  related_keywords: z
    .array(z.string())
    .describe("Seed keywords involved in this insight."),
  related_urls: z
    .array(z.string())
    .describe("Empty for seed-keywords insights — there are no URLs yet."),
  expires_at: z
    .string()
    .nullable()
    .describe("Always null for seed-keyword insights — they don't expire."),
});

export const SeedKeywordsInsights = z.object({
  summary: z
    .string()
    .describe(
      "Two to three sentences: the headline takeaway across this seed-keyword interpretation.",
    ),
  insights: z
    .array(SeedKeywordsInsight)
    .describe(
      "Insights produced from the seed keywords. Aim for 4-8 total: typically 1-3 topic_candidate, 0-1 intent_gap, 0-2 audience_alignment, 0-2 weak_signal.",
    ),
});

export type SeedKeywordsInsightsOutput = z.infer<typeof SeedKeywordsInsights>;
export type SeedKeywordsInsightOutput = z.infer<typeof SeedKeywordsInsight>;
