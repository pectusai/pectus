"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createServiceClient } from "@pectus/supabase";
import { setBrandImageGenKey } from "@/lib/image-generation";
import type { Camera } from "@/lib/brand-types";

async function brandIdFromSlug(slug: string): Promise<string | null> {
  const service = createServiceClient();
  const { data } = await service
    .from("brands")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

// ── API key ──────────────────────────────────────────────────────────────

export type SaveApiKeyResult =
  | { ok: true }
  | { ok: false; error: string };

export async function saveImageGenApiKey(
  _prev: SaveApiKeyResult | null,
  formData: FormData,
): Promise<SaveApiKeyResult> {
  const slug = String(formData.get("brand_slug") ?? "");
  const apiKey = String(formData.get("api_key") ?? "").trim();
  if (!slug) return { ok: false, error: "Missing brand context." };

  const { user } = await requireUser();
  const brandId = await brandIdFromSlug(slug);
  if (!brandId) return { ok: false, error: "Brand not found." };

  await setBrandImageGenKey(brandId, apiKey, user.id);
  revalidatePath(`/brands/${slug}/profile`);
  return { ok: true };
}

// ── Reference photos ─────────────────────────────────────────────────────

export type SignedUploadResult =
  | { ok: true; path: string; token: string; publicUrl: string }
  | { ok: false; error: string };

function safeFilename(filename: string): string {
  const ext = filename.match(/\.[a-zA-Z0-9]+$/)?.[0] ?? ".jpg";
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext.toLowerCase()}`;
}

export async function createReferenceImageUploadUrl(
  brandSlug: string,
  filename: string,
): Promise<SignedUploadResult> {
  if (!brandSlug) return { ok: false, error: "Missing brand context." };
  await requireUser();
  const service = createServiceClient();
  const path = `brand-references/${brandSlug}/${safeFilename(filename)}`;
  const { data, error } = await service.storage
    .from("article-images")
    .createSignedUploadUrl(path);
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not create upload URL." };
  }
  const { data: pub } = service.storage
    .from("article-images")
    .getPublicUrl(path);
  return { ok: true, path: data.path, token: data.token, publicUrl: pub.publicUrl };
}

export async function appendReferenceImageUrls(
  brandSlug: string,
  newUrls: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!brandSlug || newUrls.length === 0) {
    return { ok: false, error: "Nothing to append." };
  }
  await requireUser();
  const service = createServiceClient();
  const { data: brand } = await service
    .from("brands")
    .select("reference_image_urls")
    .eq("slug", brandSlug)
    .maybeSingle();
  if (!brand) return { ok: false, error: "Brand not found." };

  const existing = (
    Array.isArray(brand.reference_image_urls)
      ? (brand.reference_image_urls as string[])
      : []
  ).filter((u) => typeof u === "string");
  const merged = Array.from(new Set([...existing, ...newUrls]));

  const { error } = await service
    .from("brands")
    .update({ reference_image_urls: merged })
    .eq("slug", brandSlug);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/brands/${brandSlug}/profile`);
  return { ok: true };
}

export async function removeReferenceImage(formData: FormData): Promise<void> {
  const brandSlug = String(formData.get("brand_slug") ?? "");
  const url = String(formData.get("url") ?? "");
  if (!brandSlug || !url) return;
  await requireUser();
  const service = createServiceClient();
  const { data: brand } = await service
    .from("brands")
    .select("reference_image_urls")
    .eq("slug", brandSlug)
    .maybeSingle();
  if (!brand) return;
  const existing = (
    Array.isArray(brand.reference_image_urls)
      ? (brand.reference_image_urls as string[])
      : []
  ).filter((u) => typeof u === "string" && u !== url);
  await service
    .from("brands")
    .update({ reference_image_urls: existing })
    .eq("slug", brandSlug);

  // Best-effort: remove the storage object too if it's hosted in our bucket.
  const marker = "/storage/v1/object/public/article-images/";
  const idx = url.indexOf(marker);
  if (idx >= 0) {
    const path = url.slice(idx + marker.length);
    try {
      await service.storage.from("article-images").remove([path]);
    } catch {
      /* ignore */
    }
  }
  revalidatePath(`/brands/${brandSlug}/profile`);
}

// ── Camera presets ───────────────────────────────────────────────────────

export type SaveCamerasResult =
  | { ok: true }
  | { ok: false; error: string };

export async function saveCameras(
  brandSlug: string,
  cameras: Camera[],
): Promise<SaveCamerasResult> {
  if (!brandSlug) return { ok: false, error: "Missing brand context." };
  await requireUser();

  const cleaned: Camera[] = [];
  for (const c of cameras) {
    const id = (c.id ?? "").trim() || `cam-${Date.now()}-${cleaned.length}`;
    const title = (c.title ?? "").trim();
    const description = (c.description ?? "").trim();
    if (!title || !description) continue;
    cleaned.push({
      id,
      title,
      description,
      is_default: Boolean(c.is_default),
    });
  }
  if (cleaned.length > 0 && !cleaned.some((c) => c.is_default)) {
    cleaned[0].is_default = true;
  } else {
    let seenDefault = false;
    for (const c of cleaned) {
      if (c.is_default) {
        if (seenDefault) c.is_default = false;
        seenDefault = true;
      }
    }
  }

  const service = createServiceClient();
  const defaultCam = cleaned.find((c) => c.is_default) ?? cleaned[0];
  const update: Record<string, unknown> = { cameras: cleaned };
  if (defaultCam) {
    update.image_guidelines_md = defaultCam.description;
  }
  const { error } = await service
    .from("brands")
    .update(update)
    .eq("slug", brandSlug);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/brands/${brandSlug}/profile`);
  return { ok: true };
}
