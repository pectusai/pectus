import { z } from "zod";

/* plan-sitemap output. Tree of suggested page nodes. The runner converts
 * `local_id` references into proper UUIDs after Claude returns. */

export const PlannedNode = z.object({
  local_id: z
    .string()
    .describe(
      "Stable id within this output, used by children to reference this node as parent. Lowercase-kebab. Unique within the response.",
    ),
  parent_local_id: z
    .string()
    .nullable()
    .describe(
      "local_id of this node's parent in this same response. Null for roots.",
    ),
  title: z.string().describe("Page title. 4-8 words. Specific, not generic."),
  intent: z.enum([
    "informational",
    "commercial",
    "transactional",
    "navigational",
  ]),
  suggested_template: z
    .enum(["home", "pillar", "content", "landing", "listing", "contact", "about"])
    .describe(
      "Template hint for the page builder. Pick the one that fits this node's role in the tree.",
    ),
  suggested_purpose: z
    .enum(["home", "content", "landing", "listing", "contact", "about"])
    .describe("Page purpose category."),
  topic_id: z
    .string()
    .nullable()
    .describe(
      "Topic UUID this root pillar fulfills. Set ONLY on root nodes anchored to a topic. Null for child nodes.",
    ),
  rationale: z
    .string()
    .describe(
      "One sentence: why this node belongs in the tree at this position.",
    ),
});

export const PlanSitemap = z.object({
  summary: z
    .string()
    .describe(
      "Two to four sentences framing the sitemap: what shape it takes and why.",
    ),
  nodes: z
    .array(PlannedNode)
    .min(1)
    .describe(
      "Tree of suggested nodes. At most 3 levels deep. Roots have parent_local_id=null. Each child references its parent by local_id.",
    ),
});

export type PlanSitemapOutput = z.infer<typeof PlanSitemap>;
export type PlannedNodeOutput = z.infer<typeof PlannedNode>;
