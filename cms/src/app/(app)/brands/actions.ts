"use server";

import { mkdir, writeFile, access } from "node:fs/promises";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@pectus/supabase";
import { requireUser } from "@/lib/auth";
import { brandDir, brandJsonPath } from "@/lib/brand-paths";
import { slugify } from "@/lib/slugify";

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,79})$/;

export type CreateBrandResult =
  | { ok: true; slug: string }
  | { ok: false; error: string };

export async function createBrand(
  _prev: CreateBrandResult | null,
  formData: FormData,
): Promise<CreateBrandResult> {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();

  if (!name) return { ok: false, error: "Name is required." };
  if (name.length > 200) {
    return { ok: false, error: "Name must be 200 characters or fewer." };
  }
  const slug = slugInput || slugify(name);
  if (!SLUG_RE.test(slug)) {
    return {
      ok: false,
      error:
        "Slug must start with a letter or digit and use only lowercase letters, digits, and hyphens (max 80 chars).",
    };
  }

  const supabase = await createServerClient();

  const { data: existing } = await supabase
    .from("brands")
    .select("slug")
    .eq("slug", slug)
    .maybeSingle();
  if (existing) {
    return {
      ok: false,
      error: `Slug "${slug}" is already taken. Pick a different one.`,
    };
  }

  const { error: insertError } = await supabase
    .from("brands")
    .insert({ slug, name });
  if (insertError) {
    return { ok: false, error: `Save failed: ${insertError.message}` };
  }

  // Materialize the brand folder + starter brand.json on disk.
  try {
    const dir = brandDir(slug);
    try {
      await access(dir);
    } catch {
      await mkdir(dir, { recursive: true });
    }
    const starter = JSON.stringify({ name, slug }, null, 2);
    await writeFile(brandJsonPath(slug), starter, "utf8");
  } catch (err) {
    // Soft-fail on FS; the row is the source of truth.
    console.error("Could not write brand folder:", err);
  }

  revalidatePath("/brands");
  redirect(`/brands/${slug}/profile`);
}
