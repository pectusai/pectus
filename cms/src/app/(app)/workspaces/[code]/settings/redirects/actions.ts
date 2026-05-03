"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getWorkspaceByCode } from "@/lib/workspace";

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
  const workspace = await getWorkspaceByCode(code);

  await supabase.from("redirects").upsert(
    {
      workspace_id: workspace.id,
      from_path: fromPath,
      to_path: toPath,
      status,
      source: "manual",
    },
    { onConflict: "workspace_id,from_path" },
  );

  revalidatePath(`/workspaces/${code}/settings/redirects`);
}

export async function deleteRedirect(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!code || !id) return;

  const { supabase } = await requireAdmin();
  const workspace = await getWorkspaceByCode(code);

  await supabase
    .from("redirects")
    .delete()
    .eq("workspace_id", workspace.id)
    .eq("id", id);

  revalidatePath(`/workspaces/${code}/settings/redirects`);
}
