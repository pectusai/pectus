"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getProjectByCode } from "@/lib/project";

const MAX_SEED_KEYWORDS = 10;

export async function addSeedKeyword(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const keyword = String(formData.get("keyword") ?? "").trim();
  if (!code || !keyword) return;

  const { supabase } = await requireAdmin();
  const project = await getProjectByCode(code);

  const { count } = await supabase
    .from("seed_keywords")
    .select("id", { count: "exact", head: true })
    .eq("project_id", project.id);
  if ((count ?? 0) >= MAX_SEED_KEYWORDS) return;

  await supabase.from("seed_keywords").upsert(
    { project_id: project.id, keyword },
    { onConflict: "project_id,keyword" },
  );

  revalidatePath(`/projects/${code}/apps/seed-keywords/settings`);
}

export async function deleteSeedKeyword(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!code || !id) return;

  const { supabase } = await requireAdmin();
  const project = await getProjectByCode(code);

  await supabase
    .from("seed_keywords")
    .delete()
    .eq("project_id", project.id)
    .eq("id", id);

  revalidatePath(`/projects/${code}/apps/seed-keywords/settings`);
}
