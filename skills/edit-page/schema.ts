import { z } from "zod";

/* edit-page output. Returns the full new block array for the page being
 * edited, plus a one-line summary of what changed. The runner replaces the
 * page draft's blocks wholesale on each turn — there's no diff format. */

const HeroBlock = z.object({
  type: z.literal("hero"),
  props: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    eyebrow: z.string().optional(),
    image_url: z.string().optional(),
    cta_label: z.string().optional(),
    cta_href: z.string().optional(),
  }),
});

const ProseBlock = z.object({
  type: z.literal("prose"),
  props: z.object({
    markdown: z.string().describe("Markdown body. Headings, paragraphs, lists, links, code allowed."),
  }),
});

const FeatureGridItem = z.object({
  title: z.string(),
  description: z.string().optional(),
  icon: z.string().optional(),
  href: z.string().optional(),
});

const FeatureGridBlock = z.object({
  type: z.literal("feature_grid"),
  props: z.object({
    heading: z.string().optional(),
    items: z.array(FeatureGridItem).min(1).max(12),
  }),
});

const TestimonialBlock = z.object({
  type: z.literal("testimonial"),
  props: z.object({
    quote: z.string(),
    author: z.string().optional(),
    role: z.string().optional(),
    avatar_url: z.string().optional(),
  }),
});

const CtaBlock = z.object({
  type: z.literal("cta"),
  props: z.object({
    heading: z.string(),
    body: z.string().optional(),
    label: z.string(),
    href: z.string(),
  }),
});

const ImageBlockBlock = z.object({
  type: z.literal("image"),
  props: z.object({
    src: z.string(),
    alt: z.string().optional(),
    caption: z.string().optional(),
  }),
});

const LinkListBlock = z.object({
  type: z.literal("link_list"),
  props: z.object({
    heading: z.string().optional(),
    items: z.array(
      z.object({
        label: z.string(),
        href: z.string(),
        description: z.string().optional(),
      }),
    ),
  }),
});

const FaqBlock = z.object({
  type: z.literal("faq"),
  props: z.object({
    heading: z.string().optional(),
    items: z.array(
      z.object({
        question: z.string(),
        answer: z.string(),
      }),
    ),
  }),
});

export const Block = z.discriminatedUnion("type", [
  HeroBlock,
  ProseBlock,
  FeatureGridBlock,
  TestimonialBlock,
  CtaBlock,
  ImageBlockBlock,
  LinkListBlock,
  FaqBlock,
]);

export const EditPage = z.object({
  blocks: z
    .array(Block)
    .describe("The full new block array for the page after applying the user's instruction."),
  summary_of_change: z
    .string()
    .describe(
      "One short sentence describing what changed. Shown in the chat history.",
    ),
});

export type BlockType = z.infer<typeof Block>;
export type EditPageOutput = z.infer<typeof EditPage>;
