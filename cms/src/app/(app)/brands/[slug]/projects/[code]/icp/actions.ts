"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getProjectByCode, touchFreshness } from "@/lib/project";

export type Persona = {
  name: string;
  role: string;
  industry: string;
  company_size: string;
  challenges: string[];
  goals: string[];
};

export type Painpoint = { title: string; description: string };

export async function saveIcp(formData: FormData) {
  const { supabase, user } = await requireUser();

  const code = String(formData.get("code") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  const personasRaw = String(formData.get("personas") ?? "[]");
  const painpointsRaw = String(formData.get("painpoints") ?? "[]");

  let personas: Persona[] = [];
  let painpoints: Painpoint[] = [];
  try {
    personas = JSON.parse(personasRaw);
    painpoints = JSON.parse(painpointsRaw);
  } catch {
    return;
  }

  const project = await getProjectByCode(code);

  await supabase.from("icp_profiles").upsert(
    {
      project_id: project.id,
      personas,
      painpoints,
      notes: notes || null,
      updated_by: user.id,
    },
    { onConflict: "project_id" },
  );

  await touchFreshness(project.id, "icp", "manual");

  revalidatePath(`/projects/${code}`);
  revalidatePath(`/projects/${code}/icp`);
  revalidatePath("/projects");
}
