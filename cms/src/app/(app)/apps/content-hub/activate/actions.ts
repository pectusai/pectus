"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@pectus/supabase";
import { activateApp, setWorkspaceAppConfig } from "@/lib/apps";

function parseGithubRepo(input: string): string | null {
  const t = input.trim().replace(/\.git$/u, "").replace(/\/$/u, "");
  const ssh = t.match(/^git@github\.com:([A-Za-z0-9._-]+)\/([A-Za-z0-9._-]+)$/u);
  if (ssh) return `${ssh[1]}/${ssh[2]}`;
  const http = t.match(
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9._-]+)\/([A-Za-z0-9._-]+)$/u,
  );
  if (http) return `${http[1]}/${http[2]}`;
  const raw = t.match(/^([A-Za-z0-9._-]+)\/([A-Za-z0-9._-]+)$/u);
  if (raw) return `${raw[1]}/${raw[2]}`;
  return null;
}

function normalizeMountSlug(siteShape: string, raw: string): string {
  if (siteShape === "greenfield") return "/";
  const t = raw.trim();
  if (!t) return "/";
  let s = t.startsWith("/") ? t : `/${t}`;
  if (!s.endsWith("/")) s = `${s}/`;
  return s;
}

export async function activateContentHubAction(formData: FormData) {
  const workspaceId = String(formData.get("workspace_id") ?? "").trim();
  const siteShape = String(formData.get("site_shape") ?? "greenfield");
  const mountSlugRaw = String(formData.get("mount_slug") ?? "/");
  const repoRaw = String(formData.get("content_hub_repo") ?? "").trim();

  if (!workspaceId) {
    throw new Error("Pick a workspace before activating Content Hub.");
  }

  const repo = repoRaw ? parseGithubRepo(repoRaw) : null;
  if (repoRaw && !repo) {
    throw new Error(
      "GitHub repo must look like github.com/owner/repo or owner/repo.",
    );
  }

  const mountSlug = normalizeMountSlug(siteShape, mountSlugRaw);

  await activateApp("content-hub");

  const supabase = await createServerClient();
  await supabase
    .from("workspaces")
    .update({
      mount_slug: mountSlug,
      content_hub_repo: repo,
    })
    .eq("id", workspaceId);

  await setWorkspaceAppConfig(workspaceId, "content-hub", {
    site_shape: siteShape,
    mount_slug: mountSlug,
    content_hub_repo: repo,
  });

  const { data: ws } = await supabase
    .from("workspaces")
    .select("code")
    .eq("id", workspaceId)
    .single();

  revalidatePath("/apps");
  revalidatePath(`/workspaces/${ws?.code}/dashboard`);
  redirect(`/workspaces/${ws?.code}/dashboard`);
}
