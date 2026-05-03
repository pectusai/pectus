import { z } from "zod";

export const ScaffoldFile = z.object({
  path: z
    .string()
    .describe(
      "Path relative to the scaffold root (e.g. 'SKILL.md', 'schema.ts', 'provision.ts').",
    ),
  content: z.string().describe("Full file contents as a single string."),
  role: z
    .enum(["manifest", "schema", "provision", "readme", "reference"])
    .describe("What kind of file this is. The CLI uses this to log the scaffold tree."),
});

export const ScaffoldSpec = z.object({
  target_type: z
    .enum(["skill", "app"])
    .describe("Echo of the input target_type."),
  name: z
    .string()
    .describe(
      "Slugified name: lowercase, hyphens, no spaces. Used as the folder name and the manifest 'name' field.",
    ),
  path: z
    .string()
    .describe(
      "Where the scaffold should land relative to the repo root. Skills go in skills/<name>/, official apps in apps/<name>/, community apps in apps/community/<name>/.",
    ),
  files: z
    .array(ScaffoldFile)
    .min(2)
    .describe(
      "Every file the CLI should write. Always includes a manifest and a schema; apps with config also include a provision skeleton; everything has a README.",
    ),
  validation_notes: z
    .array(z.string())
    .describe(
      "Concerns the model flagged: tone-setting language stripped from app prompts, missing config values, suggested follow-up connectors, etc. Empty array is fine if nothing came up.",
    ),
  next_steps: z
    .array(z.string())
    .min(1)
    .describe(
      "Concrete actions the user takes after the CLI writes the files: run a command, edit a config, open a PR, etc.",
    ),
});

export type ScaffoldSpecOutput = z.infer<typeof ScaffoldSpec>;
export type ScaffoldFileOutput = z.infer<typeof ScaffoldFile>;
