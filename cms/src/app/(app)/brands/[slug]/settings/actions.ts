"use server";

import fs from "node:fs/promises";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { listBrands } from "@/lib/active-brand";
import { brandDir } from "@/lib/brand-paths";

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,79})$/;

export async function renameBrand(
  formData: FormData,
): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  const { supabase } = await requireAdmin();
  const currentSlug = String(formData.get("current_slug") ?? "").trim();
  const nextSlug = String(formData.get("slug") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();

  if (!currentSlug || !nextSlug) {
    return { ok: false, error: "Both current and next slug are required." };
  }
  if (!SLUG_RE.test(nextSlug)) {
    return {
      ok: false,
      error: "Slug must be lowercase letters, digits, or hyphens (max 80).",
    };
  }
  if (currentSlug !== nextSlug) {
    const { data: collision } = await supabase
      .from("brands")
      .select("id")
      .eq("slug", nextSlug)
      .maybeSingle();
    if (collision) {
      return { ok: false, error: `Slug "${nextSlug}" is already taken.` };
    }
  }

  const { data: brand, error: fetchError } = await supabase
    .from("brands")
    .select("id")
    .eq("slug", currentSlug)
    .maybeSingle();
  if (fetchError || !brand) {
    return { ok: false, error: "Brand not found." };
  }

  const { error: updateError } = await supabase
    .from("brands")
    .update({ slug: nextSlug, name: name || null })
    .eq("id", brand.id);
  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  if (currentSlug !== nextSlug) {
    try {
      await fs.rename(brandDir(currentSlug), brandDir(nextSlug));
    } catch {
      /* If the disk dir doesn't exist yet, that's fine — first save will
       * create the new slug dir directly. */
    }
  }

  revalidatePath("/brands");
  revalidatePath(`/brands/${nextSlug}`);
  return { ok: true, slug: nextSlug };
}

export async function deleteBrand(
  formData: FormData,
): Promise<{ ok: true; next: string } | { ok: false; error: string }> {
  const { supabase } = await requireAdmin();
  const slug = String(formData.get("brand_slug") ?? "").trim();
  if (!slug) return { ok: false, error: "Missing slug." };

  const { data: brand } = await supabase
    .from("brands")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!brand) return { ok: false, error: `Brand "${slug}" not found.` };

  const { error: deleteError } = await supabase
    .from("brands")
    .delete()
    .eq("id", brand.id);
  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  try {
    await fs.rm(brandDir(slug), { recursive: true, force: true });
  } catch {
    /* Disk delete best-effort. The DB cascade is the source of truth. */
  }

  const remaining = await listBrands();
  const next = remaining[0] ? `/brands/${remaining[0].slug}` : "/brands";
  revalidatePath("/brands");
  return { ok: true, next };
}
