import { z } from "zod";

export const KnowledgeDigest = z.object({
  audience_signals: z
    .string()
    .describe(
      "1-3 paragraphs synthesizing what the data tells us about the audience: questions they ask, formats they prefer, pain points that show up across files.",
    ),
  topic_clusters: z
    .array(
      z.object({
        topic: z.string(),
        context: z.string().describe("One-line context for the topic."),
      }),
    )
    .describe("Topics evident in the raw files."),
  quotable_moments: z
    .array(z.string())
    .min(0)
    .max(10)
    .describe("Verbatim quotes from raw data that capture audience voice or pain. Up to 5 typical."),
  source_files: z
    .array(
      z.object({
        filename: z.string(),
        type: z.string().describe("CSV, JSON, markdown, image, PDF, etc."),
        contribution: z.string().describe("One line on what this file contributed to the digest."),
      }),
    )
    .describe("Every file the digest read."),
  insights_md: z
    .string()
    .describe(
      "The full insights.md content as a single markdown string. This is what gets written to knowledge/insights.md.",
    ),
});

export type KnowledgeDigestOutput = z.infer<typeof KnowledgeDigest>;
