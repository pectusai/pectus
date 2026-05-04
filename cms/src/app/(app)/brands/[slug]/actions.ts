"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@pectus/supabase";
import { requireUser } from "@/lib/auth";

const CODE_RE = /^[a-z0-9](?:[a-z0-9-]{0,39})$/;
const LOCALE_RE = /^[a-z]{2}(-[A-Z]{2})?$/;

export type CreateProjectResult =
  | { ok: true; code: string; brandSlug: string }
  | { ok: false; error: string };

export async function createProject(
  _prev: CreateProjectResult | null,
  formData: FormData,
): Promise<CreateProjectResult> {
  await requireUser();

  const brandSlug = String(formData.get("brand_slug") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const locale = String(formData.get("locale") ?? "").trim() || "en-US";

  if (!brandSlug) return { ok: false, error: "Missing brand." };
  if (!name) return { ok: false, error: "Name is required." };
  if (!CODE_RE.test(code)) {
    return {
      ok: false,
      error:
        "Code must start with a letter or digit and use only lowercase letters, digits, and hyphens (max 40 chars).",
    };
  }
  if (!LOCALE_RE.test(locale)) {
    return {
      ok: false,
      error:
        "Locale must look like en-US, en-GB, sv-SE: two lowercase letters, dash, two uppercase letters.",
    };
  }

  // Service-role bypasses RLS; requireUser() above is the actual gate.
  const supabase = createServiceClient();

  const { data: brand } = await supabase
    .from("brands")
    .select("id")
    .eq("slug", brandSlug)
    .maybeSingle();
  if (!brand) {
    return { ok: false, error: `Brand "${brandSlug}" not found.` };
  }

  const { data: existing } = await supabase
    .from("projects")
    .select("id")
    .eq("brand_id", brand.id)
    .eq("code", code)
    .maybeSingle();
  if (existing) {
    return {
      ok: false,
      error: `Brand already has a project with code "${code}". Pick a different code.`,
    };
  }

  const { error: insertError } = await supabase.from("projects").insert({
    brand_id: brand.id,
    name,
    code,
    locale,
    default_locale: locale,
    enabled_locales: [locale],
  });
  if (insertError) {
    return { ok: false, error: `Save failed: ${insertError.message}` };
  }

  // Default review policy.
  const { data: created } = await supabase
    .from("projects")
    .select("id")
    .eq("brand_id", brand.id)
    .eq("code", code)
    .single();
  if (created) {
    await supabase.from("review_policy").insert({
      project_id: created.id,
      required_roles: ["brand_reviewer"],
      min_approvals: 1,
    });
  }

  revalidatePath(`/brands/${brandSlug}`);
  redirect(`/brands/${brandSlug}/projects/${code}`);
}
