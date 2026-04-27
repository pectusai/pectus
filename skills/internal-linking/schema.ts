import { z } from "zod";

export const LinkRecommendation = z.object({
  source_url: z.string(),
  target_url: z.string(),
  anchor_text: z.string().describe("Natural anchor text — must read normally inside a sentence."),
  why: z
    .string()
    .describe("One sentence explaining the topical relationship that makes this link useful."),
  confidence: z.enum(["high", "medium", "low"]),
});

export const InternalLinking = z.object({
  link_recommendations: z.array(LinkRecommendation),
  linksculpting_md: z
    .string()
    .describe(
      "A complete markdown document the user can hand to their dev team. Format: per-target-URL, list inbound links to add, with anchor text. Order targets by current GSC impressions descending.",
    ),
});

export type InternalLinkingOutput = z.infer<typeof InternalLinking>;
