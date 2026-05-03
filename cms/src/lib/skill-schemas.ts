/* Central registry mapping skill name → its Zod schema.
 *
 * The skill-runner reads SKILL.md (with `schema: ./schema.ts` in frontmatter)
 * to know structured-output is requested. It then looks up the schema HERE,
 * not by importing the file dynamically. This keeps Next bundling happy and
 * makes "is this skill structured?" a single point of truth.
 *
 * To add a new structured skill: add a line below + import its schema.
 */

import type { ZodSchema } from "zod";
import { WeeklyAnalysis } from "@pectus/skills/weekly-analysis/schema";
import { PlanSitemap } from "@pectus/skills/plan-sitemap/schema";
import { EditPage } from "@pectus/skills/edit-page/schema";
import { SeedKeywordsInsights } from "@pectus/apps/seed-keywords/insights/schema";

export const skillSchemas: Record<string, ZodSchema> = {
  "weekly-analysis": WeeklyAnalysis,
  "plan-sitemap": PlanSitemap,
  "edit-page": EditPage,
  "seed-keywords/insights": SeedKeywordsInsights,
};
