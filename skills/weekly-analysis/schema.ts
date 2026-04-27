import { z } from "zod";

export const PostSuggestion = z.object({
  title: z.string().describe("Working headline. Concrete, not generic."),
  angle: z.string().describe("One-sentence angle — what this post argues or teaches."),
  primary_keyword: z.string().describe("The main keyword this post should rank for."),
  supporting_keywords: z
    .array(z.string())
    .describe("Secondary keywords this post can pick up along the way."),
  rationale: z
    .string()
    .describe(
      "Two to four sentences explaining WHY this post is the right move this week: the gap, the signal in the data, the user question left unanswered.",
    ),
  projected_monthly_traffic: z
    .number()
    .int()
    .describe(
      "Estimated monthly organic sessions if this post ranks in the top 5. Use GSC impression and CTR data to reason.",
    ),
  target_persona: z.string().describe("Which ICP persona this piece speaks to."),
  content_type: z
    .enum([
      "long_form_guide",
      "comparison",
      "listicle",
      "how_to",
      "thought_leadership",
      "faq",
      "glossary",
    ])
    .describe("Format that fits the intent."),
});

export const KeywordRow = z.object({
  keyword: z.string(),
  impressions: z.number().int().nullable(),
  clicks: z.number().int().nullable(),
  position: z.number().nullable(),
  note: z.string().describe("One short phrase on why this keyword matters right now."),
});

export const OldPostRisingRow = z.object({
  slug_or_title: z.string(),
  traffic_change: z.string().describe("Direction + magnitude, e.g. '+212% impressions in 30d'."),
  suggested_action: z
    .string()
    .describe("Short advice: refresh, expand, internal-link, cluster, etc."),
});

export const CategorySuggestion = z.object({
  name: z.string(),
  why_now: z.string(),
  example_keywords: z.array(z.string()),
});

export const WeeklyAnalysis = z.object({
  summary: z
    .string()
    .describe(
      "Three to five sentences framing the week: what changed in search, where the biggest opportunity is, which ICP to target.",
    ),
  post_suggestions: z
    .array(PostSuggestion)
    .min(4)
    .max(6)
    .describe("4-6 prioritised posts to write this week, ordered by impact."),
  suggested_articles_by_traffic: z
    .array(
      z.object({
        topic: z.string(),
        primary_keyword: z.string(),
        projected_monthly_traffic: z.number().int(),
        reasoning: z.string(),
      }),
    )
    .describe("Articles ranked by projected traffic if they land in the top 5 after publishing."),
  rising_keywords: z
    .array(KeywordRow)
    .describe(
      "Keywords with rising impressions but poor ranking or no clicks — the sweet spot to act on now.",
    ),
  old_posts_rising: z
    .array(OldPostRisingRow)
    .describe(
      "Already-published posts that are gaining traffic in the last 30 days. Prime candidates for a refresh or expansion.",
    ),
  keyword_clusters: z
    .array(
      z.object({
        cluster_name: z.string(),
        keywords: z.array(z.string()),
        intent: z
          .enum(["informational", "commercial", "transactional", "navigational"])
          .describe("Dominant intent for the cluster."),
        pillar_recommendation: z.string(),
      }),
    )
    .describe("Keywords grouped into topical clusters for content planning."),
  suggested_new_categories: z
    .array(CategorySuggestion)
    .describe(
      "Emerging topics not yet covered as site categories. Think 'AI' a year before it was obvious.",
    ),
  suggested_negatives: z
    .array(
      z.object({
        keyword: z.string(),
        reason: z.string(),
      }),
    )
    .describe(
      "Keywords to actively avoid: wrong intent, wrong audience, or noise polluting the data.",
    ),
});

export type WeeklyAnalysisOutput = z.infer<typeof WeeklyAnalysis>;
export type PostSuggestionOutput = z.infer<typeof PostSuggestion>;
