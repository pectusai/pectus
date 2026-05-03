"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@pectus/supabase";
import { requireUser } from "@/lib/auth";
import { runSkill, runInterpretationsIfStale } from "@/lib/skill-runner";
import type { PlanSitemapOutput, PlannedNodeOutput } from "@pectus/skills/plan-sitemap/schema";

/* Server actions for the Pages surface.
 *
 * - planPillar: invoke plan-sitemap in one-pillar mode for a chosen topic.
 * - planFullSite: invoke plan-sitemap in full-site mode.
 * - adoptSuggestedNode: flip status from 'suggested' to 'adopted'.
 * - dismissSuggestedNode: delete the node + remember the dismissal.
 */

type PlanResult =
  | { ok: true; nodesWritten: number; runId: string | null }
  | { ok: false; error: string };

export async function planPillar(
  workspaceCode: string,
  topicId: string,
): Promise<PlanResult> {
  const { user } = await requireUser();
  const supabase = await createServerClient();

  const { data: ws } = await supabase
    .from("workspaces")
    .select("id, code")
    .eq("code", workspaceCode)
    .single();
  if (!ws) return { ok: false, error: "Workspace not found." };

  const { data: topic } = await supabase
    .from("topics")
    .select("id, name")
    .eq("id", topicId)
    .eq("workspace_id", ws.id)
    .single();
  if (!topic) return { ok: false, error: "Topic not found." };

  /* Refresh stale insights before running plan-sitemap so the skill reads
   * current interpretations from connected apps. */
  await runInterpretationsIfStale(ws.id);

  const result = await runSkill<PlanSitemapOutput>({
    skill: "plan-sitemap",
    workspaceId: ws.id,
    userId: user.id,
    args: { mode: "one-pillar", topic_id: topic.id, topic_name: topic.name },
  });
  if (!result.ok) return { ok: false, error: result.error };
  if (result.mode !== "structured")
    return { ok: false, error: "Skill did not return structured output." };

  const written = await writePlannedNodes(
    ws.id,
    result.output.nodes,
    new Map([[topic.id, topic.id]]),
  );

  revalidatePath(`/workspaces/${workspaceCode}/pages`);
  return { ok: true, nodesWritten: written, runId: result.runId };
}

export async function planFullSite(workspaceCode: string): Promise<PlanResult> {
  const { user } = await requireUser();
  const supabase = await createServerClient();

  const { data: ws } = await supabase
    .from("workspaces")
    .select("id, code")
    .eq("code", workspaceCode)
    .single();
  if (!ws) return { ok: false, error: "Workspace not found." };

  const { data: topics } = await supabase
    .from("topics")
    .select("id, name, status")
    .eq("workspace_id", ws.id)
    .eq("status", "unfulfilled");
  const topicMap = new Map<string, string>();
  for (const t of topics ?? []) topicMap.set(t.id, t.id);

  await runInterpretationsIfStale(ws.id);

  const result = await runSkill<PlanSitemapOutput>({
    skill: "plan-sitemap",
    workspaceId: ws.id,
    userId: user.id,
    args: { mode: "full-site" },
  });
  if (!result.ok) return { ok: false, error: result.error };
  if (result.mode !== "structured")
    return { ok: false, error: "Skill did not return structured output." };

  const written = await writePlannedNodes(ws.id, result.output.nodes, topicMap);

  revalidatePath(`/workspaces/${workspaceCode}/pages`);
  return { ok: true, nodesWritten: written, runId: result.runId };
}

export async function adoptSuggestedNode(
  workspaceCode: string,
  nodeId: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("site_plan_nodes")
    .update({ status: "adopted" })
    .eq("id", nodeId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/workspaces/${workspaceCode}/pages`);
  return { ok: true };
}

export async function dismissSuggestedNode(
  workspaceCode: string,
  nodeId: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  const supabase = await createServerClient();
  /* Cascade delete handles children. We don't preserve dismissal history
   * for nodes (only for topics) — re-running plan-sitemap can re-suggest. */
  const { error } = await supabase
    .from("site_plan_nodes")
    .delete()
    .eq("id", nodeId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/workspaces/${workspaceCode}/pages`);
  return { ok: true };
}

/* ------------------------------------------------------------------------- *
 * Helpers
 * ------------------------------------------------------------------------- */

/** Insert planned nodes preserving local_id → uuid resolution.
 * Returns the count of rows actually written (after dedup against existing). */
async function writePlannedNodes(
  workspaceId: string,
  planned: PlannedNodeOutput[],
  validTopicIds: Map<string, string>,
): Promise<number> {
  const supabase = await createServerClient();

  /* Order by depth so parents land before children. */
  const sorted = sortByDependency(planned);

  /* Pre-fetch existing titles to skip duplicates. */
  const { data: existing } = await supabase
    .from("site_plan_nodes")
    .select("title")
    .eq("workspace_id", workspaceId);
  const existingTitles = new Set(
    (existing ?? []).map((r) => r.title.toLowerCase().trim()),
  );

  const localToUuid = new Map<string, string>();
  let position = 0;
  let written = 0;

  for (const node of sorted) {
    const titleKey = node.title.toLowerCase().trim();
    if (existingTitles.has(titleKey)) continue;

    const parentUuid = node.parent_local_id
      ? localToUuid.get(node.parent_local_id) ?? null
      : null;
    if (node.parent_local_id && !parentUuid) {
      /* Parent not in our local map and not in db. Skip — orphan. */
      continue;
    }

    const topicId =
      node.topic_id && validTopicIds.has(node.topic_id) && !parentUuid
        ? node.topic_id
        : null;

    const { data: inserted } = await supabase
      .from("site_plan_nodes")
      .insert({
        workspace_id: workspaceId,
        parent_id: parentUuid,
        topic_id: topicId,
        title: node.title,
        intent: node.intent,
        suggested_template: node.suggested_template,
        suggested_purpose: node.suggested_purpose,
        provenance: "plan-sitemap",
        status: "suggested",
        position: position++,
        rationale: node.rationale,
      })
      .select("id")
      .single();

    if (inserted?.id) {
      localToUuid.set(node.local_id, inserted.id);
      existingTitles.add(titleKey);
      written++;
    }
  }

  return written;
}

/** Stable order: roots first, then their children, then grandchildren. */
function sortByDependency(nodes: PlannedNodeOutput[]): PlannedNodeOutput[] {
  const byLocal = new Map(nodes.map((n) => [n.local_id, n] as const));
  const result: PlannedNodeOutput[] = [];
  const visited = new Set<string>();

  function visit(local: string) {
    if (visited.has(local)) return;
    const n = byLocal.get(local);
    if (!n) return;
    visited.add(local);
    if (n.parent_local_id) visit(n.parent_local_id);
    result.push(n);
  }
  for (const n of nodes) visit(n.local_id);
  return result;
}
