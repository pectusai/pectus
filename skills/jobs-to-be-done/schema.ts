import { z } from "zod";

export const Job = z.object({
  job_id: z.string().describe("Stable kebab-case identifier."),
  statement: z
    .string()
    .describe(
      "When [situation], I want to [motivation], so I can [outcome]. Use this exact format.",
    ),
  underlying_needs: z.array(z.string()),
  example_keywords: z
    .array(z.string())
    .describe("Keywords from the input list that map to this job."),
});

export const PersonaJobs = z.object({
  persona_name: z.string(),
  description: z.string().describe("Two-sentence persona summary."),
  jobs: z.array(Job),
});

export const JobsToBeDone = z.object({
  jtbd_per_persona: z.array(PersonaJobs).min(1),
  keyword_to_job_map: z
    .array(
      z.object({
        keyword: z.string(),
        job_ids: z.array(z.string()).describe("References to job_id values above."),
      }),
    )
    .describe("Every input keyword mapped to one or more jobs."),
  uncovered_jobs: z
    .array(
      z.object({
        job_statement: z.string(),
        evidence: z
          .string()
          .describe(
            "Why this job exists for this audience even though no keyword maps to it — pulled from ICP painpoints or knowledge insights.",
          ),
        priority: z.enum(["high", "medium", "low"]),
      }),
    )
    .describe("Jobs the audience has but no keyword in the input list captures yet."),
});

export type JobsToBeDoneOutput = z.infer<typeof JobsToBeDone>;
