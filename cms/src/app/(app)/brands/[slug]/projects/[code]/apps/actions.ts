"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getProjectByCode } from "@/lib/project";
import { activateAppForProject, deactivateAppForProject } from "@/lib/apps";

export async function activateAction(formData: FormData) {
  await requireUser();
  const appName = String(formData.get("app_name") ?? "").trim();
  const code = String(formData.get("project_code") ?? "").trim();
  const slug = String(formData.get("brand_slug") ?? "").trim();
  if (!appName || !code) return;
  const project = await getProjectByCode(code);
  await activateAppForProject(project.id, appName);
  revalidatePath(`/brands/${slug}/projects/${code}/apps`);
  revalidatePath(`/brands/${slug}/projects/${code}`);
}

export async function deactivateAction(formData: FormData) {
  await requireUser();
  const appName = String(formData.get("app_name") ?? "").trim();
  const code = String(formData.get("project_code") ?? "").trim();
  const slug = String(formData.get("brand_slug") ?? "").trim();
  if (!appName || !code) return;
  const project = await getProjectByCode(code);
  await deactivateAppForProject(project.id, appName);
  revalidatePath(`/brands/${slug}/projects/${code}/apps`);
  revalidatePath(`/brands/${slug}/projects/${code}`);
}
