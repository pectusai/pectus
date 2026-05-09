import { z } from "zod";

export const PostSuggestion = z.object({
  title: z.string().describe("Working headline. Concrete, not generic."),
  angle: z
    .string()
    .describe("One-sentence angle — what this post argues or teaches."),
  primary_keyword: z
    .string()
    .describe("The main keyword this post should rank for."),
  supporting_keywords: z
    .array(z.string())
    .describe(
      "Secondary keywords this post can pick up along the way.",
    ),
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
  target_persona: z
    .string()
    .describe("Which ICP persona this piece speaks to."),
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

export type PostSuggestion = z.infer<typeof PostSuggestion>;

const KeywordRow = z.object({
  keyword: z.string(),
  impressions: z.number().int().nullable(),
  clicks: z.number().int().nullable(),
  position: z.number().nullable(),
  note: z
    .string()
    .describe("One short phrase on why this keyword matters right now."),
});

const OldPostRisingRow = z.object({
  slug_or_title: z.string(),
  traffic_change: z
    .string()
    .describe("Direction + magnitude, e.g. '+212% impressions in 30d'."),
  suggested_action: z
    .string()
    .describe(
      "Short advice: refresh, expand, internal-link, cluster, etc.",
    ),
});

const CategorySuggestion = z.object({
  name: z.string(),
  why_now: z.string(),
  example_keywords: z.array(z.string()),
});

export const AnalysisStage1 = z.object({
  summary: z
    .string()
    .describe(
      "Three to five sentences framing the week: what changed in search, where the biggest opportunity is, which ICP to target.",
    ),
  rising_keywords: z
    .array(KeywordRow)
    .max(12)
    .describe(
      "Up to 12 keywords with rising impressions but poor ranking or no clicks — the sweet spot to act on now. Pick the highest-leverage ones, don't pad.",
    ),
  old_posts_rising: z
    .array(OldPostRisingRow)
    .max(8)
    .describe(
      "Up to 8 already-published posts that are gaining traffic in the last 30 days. Prime candidates for a refresh or expansion.",
    ),
  keyword_clusters: z
    .array(
      z.object({
        cluster_name: z.string(),
        keywords: z.array(z.string()).max(10),
        intent: z
          .enum([
            "informational",
            "commercial",
            "transactional",
            "navigational",
          ])
          .describe("Dominant intent for the cluster."),
        pillar_recommendation: z.string(),
      }),
    )
    .max(6)
    .describe(
      "Up to 6 keyword clusters for content planning. Each cluster lists at most 10 representative keywords.",
    ),
  suggested_new_categories: z
    .array(CategorySuggestion)
    .max(4)
    .describe(
      "Up to 4 emerging topics not yet covered as site categories. Think 'AI' a year before it was obvious.",
    ),
  suggested_negatives: z
    .array(
      z.object({
        keyword: z.string(),
        reason: z.string(),
      }),
    )
    .max(10)
    .describe(
      "Up to 10 keywords to actively avoid: wrong intent, wrong audience, or noise polluting the data.",
    ),
});

export type AnalysisStage1 = z.infer<typeof AnalysisStage1>;

export const AnalysisStage2 = z.object({
  post_suggestions: z
    .array(PostSuggestion)
    .min(5)
    .max(5)
    .describe(
      "Exactly 5 prioritised posts to write this week, ordered by impact.",
    ),
  suggested_articles_by_traffic: z
    .array(
      z.object({
        topic: z.string(),
        primary_keyword: z.string(),
        projected_monthly_traffic: z.number().int(),
        reasoning: z.string(),
      }),
    )
    .max(8)
    .describe(
      "Up to 8 articles ranked by projected traffic if they land in the top 5 after publishing.",
    ),
});

export type AnalysisStage2 = z.infer<typeof AnalysisStage2>;

export const ArticleBlockSchema = z.object({
  type: z.enum(["h2", "p"]),
  text: z.string(),
});

export const ArticleDraftSchema = z.object({
  title: z
    .string()
    .describe("Punchy headline for the blog post. Under 70 characters."),
  description: z
    .string()
    .describe(
      "Meta description, 140 to 160 characters, natural language, no clickbait.",
    ),
  category: z
    .string()
    .describe(
      "Short category label such as 'Recruitment tips', 'Employer branding', 'Candidate experience'.",
    ),
  blocks: z
    .array(ArticleBlockSchema)
    .describe(
      "Ordered body blocks. Alternate h2 (section heading) and p (one or two paragraphs under it). Aim for 4 to 6 h2 sections.",
    ),
});

export type ArticleDraft = z.infer<typeof ArticleDraftSchema>;
