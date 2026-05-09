"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getBrandBySlug } from "@/lib/active-brand";
import { slugify } from "@/lib/slugify";

export type BlankResult =
  | { ok: true; slug: string }
  | { ok: false; error: string };

export async function createBlankArticle(
  _prev: BlankResult | null,
  formData: FormData,
): Promise<BlankResult> {
  const brandSlug = String(formData.get("brand_slug") ?? "");
  const code = String(formData.get("code") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!brandSlug || !code) return { ok: false, error: "Missing project context." };
  if (!title) return { ok: false, error: "Give it a working title first." };

  const brand = await getBrandBySlug(brandSlug);
  const { supabase, user } = await requireUser();
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("brand_id", brand.id)
    .eq("code", code)
    .maybeSingle();
  if (!project) return { ok: false, error: `Project ${code} not found.` };

  let slug = slugify(title) || `article-${Date.now()}`;
  const { data: existing } = await supabase
    .from("articles")
    .select("id")
    .eq("project_id", project.id)
    .eq("slug", slug)
    .maybeSingle();
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const { error: insertErr } = await supabase.from("articles").insert({
    project_id: project.id,
    slug,
    title,
    description: null,
    category: null,
    blocks: [],
    word_count: 0,
    status: "draft",
    source: "manual",
    created_by: user.id,
  });
  if (insertErr) {
    return { ok: false, error: `Couldn't create draft: ${insertErr.message}` };
  }

  revalidatePath(
    `/brands/${brandSlug}/projects/${code}/apps/content-hub/articles`,
  );
  redirect(
    `/brands/${brandSlug}/projects/${code}/apps/content-hub/articles/${slug}`,
  );
}
