"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getProjectByCode } from "@/lib/project";

function normalizePath(raw: string): string {
  let s = raw.trim();
  if (!s) return s;
  if (!s.startsWith("/")) s = `/${s}`;
  return s;
}

export async function addRedirect(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const fromPath = normalizePath(String(formData.get("from_path") ?? ""));
  const toPath = normalizePath(String(formData.get("to_path") ?? ""));
  const status = Number(formData.get("status") ?? 301);

  if (!code || !fromPath || !toPath) return;
  if (fromPath === toPath) return;
  if (status !== 301 && status !== 302) return;

  const { supabase } = await requireAdmin();
  const project = await getProjectByCode(code);

  await supabase.from("redirects").upsert(
    {
      project_id: project.id,
      from_path: fromPath,
      to_path: toPath,
      status,
      source: "manual",
    },
    { onConflict: "project_id,from_path" },
  );

  revalidatePath(`/projects/${code}/apps/content-hub/settings/redirects`);
}

export async function deleteRedirect(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!code || !id) return;

  const { supabase } = await requireAdmin();
  const project = await getProjectByCode(code);

  await supabase
    .from("redirects")
    .delete()
    .eq("project_id", project.id)
    .eq("id", id);

  revalidatePath(`/projects/${code}/apps/content-hub/settings/redirects`);
}
