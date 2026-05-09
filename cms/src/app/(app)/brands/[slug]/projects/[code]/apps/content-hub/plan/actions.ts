"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getProjectByCode, touchFreshness } from "@/lib/project";
import { runSkill, runInterpretationsIfStale } from "@/lib/skill-runner";
import { createServerClient } from "@pectus/supabase";

export type GenerateResult =
  | { ok: true; output: string; runId: string | null }
  | { ok: false; error: string };

function isoWeekStart(d = new Date()): string {
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

export async function generateWeeklyAnalysis(
  code: string,
): Promise<GenerateResult> {
  if (!code) return { ok: false, error: "Missing project." };

  const project = await getProjectByCode(code);
  const { supabase, user } = await requireUser();

  const week_start = isoWeekStart();

  const result = await runSkill({
    skill: "weekly-analysis",
    projectId: project.id,
    userId: user.id,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  /* Save the human-readable output to weekly_analyses. PR4 will replace this
   * with parsed JSON once the schema is wired into the runner. */
  await supabase.from("weekly_analyses").upsert(
    {
      project_id: project.id,
      week_start,
      status: "done",
      generated_by: user.id,
      generated_at: new Date().toISOString(),
      analysis: { raw: result.output },
      skill_run_id: result.runId,
    },
    { onConflict: "project_id,week_start" },
  );

  await touchFreshness(project.id, "weekly_analysis", "skill-runner");

  revalidatePath(`/projects/${code}/apps/content-hub/plan`);
  revalidatePath(`/projects/${code}`);

  return {
    ok: true,
    output: String(result.output ?? ""),
    runId: result.runId,
  };
}

/* Force re-interpretation of every connected app's data. Wired to a button
 * with a cost-warning modal — see feedback_act_before_regenerate.md. */
export async function refreshInsights(
  code: string,
): Promise<
  | { ok: true; reinterpreted: string[]; skipped: string[]; failed: string[] }
  | { ok: false; error: string }
> {
  if (!code) return { ok: false, error: "Missing project." };
  await requireUser();
  const project = await getProjectByCode(code);

  const result = await runInterpretationsIfStale(project.id, { force: true });
  revalidatePath(`/projects/${code}/apps/content-hub/plan`);
  return { ok: true, ...result };
}

/* Surface the data the cost-warning modal uses to size up "have you acted on
 * the last batch?". Returns counts of unacted-on items. */
export async function getInsightsActionableSnapshot(
  code: string,
): Promise<{
  insightCount: number;
  unadoptedSuggestedNodes: number;
  hasSeedKeywords: boolean;
}> {
  await requireUser();
  const supabase = await createServerClient();
  const project = await getProjectByCode(code);

  const [insights, suggested, seeds] = await Promise.all([
    supabase
      .from("insights")
      .select("id", { count: "exact", head: true })
      .eq("project_id", project.id),
    supabase
      .from("site_plan_nodes")
      .select("id", { count: "exact", head: true })
      .eq("project_id", project.id)
      .eq("status", "suggested"),
    supabase
      .from("seed_keywords")
      .select("id", { count: "exact", head: true })
      .eq("project_id", project.id),
  ]);

  return {
    insightCount: insights.count ?? 0,
    unadoptedSuggestedNodes: suggested.count ?? 0,
    hasSeedKeywords: (seeds.count ?? 0) > 0,
  };
}
