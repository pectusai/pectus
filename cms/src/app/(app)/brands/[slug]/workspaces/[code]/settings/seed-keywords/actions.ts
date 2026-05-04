"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getWorkspaceByCode } from "@/lib/workspace";

const MAX_SEED_KEYWORDS = 10;

export async function addSeedKeyword(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const keyword = String(formData.get("keyword") ?? "").trim();
  if (!code || !keyword) return;

  const { supabase } = await requireAdmin();
  const workspace = await getWorkspaceByCode(code);

  const { count } = await supabase
    .from("seed_keywords")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspace.id);
  if ((count ?? 0) >= MAX_SEED_KEYWORDS) return;

  await supabase.from("seed_keywords").upsert(
    { workspace_id: workspace.id, keyword },
    { onConflict: "workspace_id,keyword" },
  );

  revalidatePath(`/workspaces/${code}/settings/seed-keywords`);
}

export async function deleteSeedKeyword(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!code || !id) return;

  const { supabase } = await requireAdmin();
  const workspace = await getWorkspaceByCode(code);

  await supabase
    .from("seed_keywords")
    .delete()
    .eq("workspace_id", workspace.id)
    .eq("id", id);

  revalidatePath(`/workspaces/${code}/settings/seed-keywords`);
}
