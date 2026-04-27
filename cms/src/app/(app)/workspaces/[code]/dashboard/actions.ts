"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getWorkspaceByCode, touchFreshness } from "@/lib/workspace";
import { runSkill } from "@/lib/skill-runner";

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
  if (!code) return { ok: false, error: "Missing workspace." };

  const workspace = await getWorkspaceByCode(code);
  const { supabase, user } = await requireUser();

  const week_start = isoWeekStart();

  const result = await runSkill({
    skill: "weekly-analysis",
    workspaceId: workspace.id,
    userId: user.id,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  /* Save the human-readable output to weekly_analyses. PR4 will replace this
   * with parsed JSON once the schema is wired into the runner. */
  await supabase.from("weekly_analyses").upsert(
    {
      workspace_id: workspace.id,
      week_start,
      status: "done",
      generated_by: user.id,
      generated_at: new Date().toISOString(),
      analysis: { raw: result.output },
      skill_run_id: result.runId,
    },
    { onConflict: "workspace_id,week_start" },
  );

  await touchFreshness(workspace.id, "weekly_analysis", "skill-runner");

  revalidatePath(`/workspaces/${code}/dashboard`);
  revalidatePath(`/workspaces/${code}`);

  return { ok: true, output: result.output, runId: result.runId };
}
