"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createServiceClient } from "@pectus/supabase";
import {
  setBrandImageGenKey,
  setBrandKeyForProvider,
  type ImageProvider,
} from "@/lib/image-generation";
import { describeImageFromUrl } from "@/lib/describe-image";
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

export async function saveProviderApiKey(
  _prev: SaveApiKeyResult | null,
  formData: FormData,
): Promise<SaveApiKeyResult> {
  const slug = String(formData.get("brand_slug") ?? "");
  const provider = String(formData.get("provider") ?? "") as ImageProvider;
  const apiKey = String(formData.get("api_key") ?? "").trim();
  if (!slug) return { ok: false, error: "Missing brand context." };
  if (provider !== "google" && provider !== "fal" && provider !== "replicate") {
    return { ok: false, error: `Unknown provider: ${provider}` };
  }

  const { user } = await requireUser();
  const brandId = await brandIdFromSlug(slug);
  if (!brandId) return { ok: false, error: "Brand not found." };

  await setBrandKeyForProvider(brandId, provider, apiKey, user.id);
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

// ── Example photo categories (description + category per photo) ─────────

type StoredPhoto = { id: string; url: string; description: string };
type StoredCategory = { id: string; label: string; photos: StoredPhoto[] };

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export type ExamplePhotoInput = {
  url: string;
  description: string;
  categoryLabel: string;
};

async function loadCategoriesAndRefs(
  brandSlug: string,
): Promise<
  { ok: true; categories: StoredCategory[]; refs: string[] }
  | { ok: false; error: string }
> {
  const service = createServiceClient();
  const { data: brand } = await service
    .from("brands")
    .select("example_photo_categories, reference_image_urls")
    .eq("slug", brandSlug)
    .maybeSingle();
  if (!brand) return { ok: false, error: "Brand not found." };
  const categories: StoredCategory[] = Array.isArray(
    brand.example_photo_categories,
  )
    ? (brand.example_photo_categories as StoredCategory[])
    : [];
  const refs = (
    Array.isArray(brand.reference_image_urls)
      ? (brand.reference_image_urls as unknown[])
      : []
  ).filter((u): u is string => typeof u === "string");
  return { ok: true, categories, refs };
}

function findOrCreateCategory(
  categories: StoredCategory[],
  label: string,
): StoredCategory {
  const trimmed = label.trim() || "Uncategorized";
  let cat = categories.find(
    (c) => c.label.toLowerCase() === trimmed.toLowerCase(),
  );
  if (!cat) {
    cat = { id: newId("cat"), label: trimmed, photos: [] };
    categories.push(cat);
  }
  return cat;
}

export async function saveExamplePhotosBatch(
  brandSlug: string,
  photos: ExamplePhotoInput[],
): Promise<{ ok: true; saved: number } | { ok: false; error: string }> {
  if (!brandSlug || photos.length === 0) {
    return { ok: false, error: "Nothing to save." };
  }
  await requireUser();
  const loaded = await loadCategoriesAndRefs(brandSlug);
  if (!loaded.ok) return loaded;

  const { categories, refs } = loaded;
  let added = 0;
  for (const p of photos) {
    if (!p.url) continue;
    const cat = findOrCreateCategory(categories, p.categoryLabel);
    if (cat.photos.some((ph) => ph.url === p.url)) continue;
    cat.photos.push({
      id: newId("ph"),
      url: p.url,
      description: (p.description ?? "").trim(),
    });
    added++;
  }

  // If a saved photo was previously in the flat reference list, drop it from
  // there so we don't show it twice.
  const movedUrls = new Set(photos.map((p) => p.url));
  const newRefs = refs.filter((u) => !movedUrls.has(u));

  const service = createServiceClient();
  const { error } = await service
    .from("brands")
    .update({
      example_photo_categories: categories,
      reference_image_urls: newRefs,
    })
    .eq("slug", brandSlug);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/brands/${brandSlug}/profile`);
  return { ok: true, saved: added };
}

export async function updateExamplePhotoDescription(
  brandSlug: string,
  categoryId: string,
  photoId: string,
  description: string,
  newCategoryLabel: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireUser();
  const loaded = await loadCategoriesAndRefs(brandSlug);
  if (!loaded.ok) return loaded;
  const { categories } = loaded;

  const sourceCat = categories.find((c) => c.id === categoryId);
  if (!sourceCat) return { ok: false, error: "Category not found." };
  const photo = sourceCat.photos.find((p) => p.id === photoId);
  if (!photo) return { ok: false, error: "Photo not found." };

  photo.description = (description ?? "").trim();

  if (newCategoryLabel && newCategoryLabel.trim()) {
    const targetCat = findOrCreateCategory(categories, newCategoryLabel);
    if (targetCat.id !== sourceCat.id) {
      sourceCat.photos = sourceCat.photos.filter((p) => p.id !== photoId);
      targetCat.photos.push(photo);
    }
  }

  // Drop any newly-empty categories.
  const trimmed = categories.filter((c) => c.photos.length > 0);

  const service = createServiceClient();
  const { error } = await service
    .from("brands")
    .update({ example_photo_categories: trimmed })
    .eq("slug", brandSlug);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/brands/${brandSlug}/profile`);
  return { ok: true };
}

export async function removeExamplePhoto(
  brandSlug: string,
  categoryId: string,
  photoId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireUser();
  const loaded = await loadCategoriesAndRefs(brandSlug);
  if (!loaded.ok) return loaded;
  const { categories } = loaded;

  const cat = categories.find((c) => c.id === categoryId);
  if (!cat) return { ok: false, error: "Category not found." };
  cat.photos = cat.photos.filter((p) => p.id !== photoId);
  const trimmed = categories.filter((c) => c.photos.length > 0);

  const service = createServiceClient();
  const { error } = await service
    .from("brands")
    .update({ example_photo_categories: trimmed })
    .eq("slug", brandSlug);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/brands/${brandSlug}/profile`);
  return { ok: true };
}

// ── Spec-aligned full lifecycle: signed upload + bulk save + describe ────

export type ExampleSavePhoto = {
  id?: string;
  url: string;
  storage_path?: string;
  description: string;
};
export type ExampleSaveCategory = {
  id?: string;
  label: string;
  photos: ExampleSavePhoto[];
};
export type StoredExamplePhoto = {
  id: string;
  url: string;
  storage_path: string;
  description: string;
};
export type StoredExampleCategory = {
  id: string;
  label: string;
  photos: StoredExamplePhoto[];
};

export type SignedExampleUploadResult =
  | {
      ok: true;
      path: string;
      token: string;
      publicUrl: string;
    }
  | { ok: false; error: string };

export async function createExamplePhotoUploadUrl(
  brandSlug: string,
  filename: string,
): Promise<SignedExampleUploadResult> {
  if (!brandSlug || !filename) {
    return { ok: false, error: "Missing brand or filename." };
  }
  await requireUser();
  const safeName = filename.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
  const ext = (safeName.split(".").pop() || "jpg").slice(0, 8) || "jpg";
  const random = Math.random().toString(36).slice(2, 10);
  const path = `brand-examples/${brandSlug}/${Date.now()}-${random}.${ext}`;
  const service = createServiceClient();
  const { data, error } = await service.storage
    .from("article-images")
    .createSignedUploadUrl(path);
  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Could not create upload URL.",
    };
  }
  const { data: pub } = service.storage
    .from("article-images")
    .getPublicUrl(path);
  return { ok: true, path: data.path, token: data.token, publicUrl: pub.publicUrl };
}

function cleanCategories(
  raw: ExampleSaveCategory[],
): { ok: true; cleaned: StoredExampleCategory[] } | { ok: false; error: string } {
  const cleaned: StoredExampleCategory[] = [];
  for (const cat of raw) {
    const label = (cat.label ?? "").trim();
    const id = cat.id && typeof cat.id === "string" ? cat.id : newId("cat");
    const photos: StoredExamplePhoto[] = [];
    for (const photo of cat.photos ?? []) {
      const url = (photo.url ?? "").trim();
      if (!url) continue;
      photos.push({
        id:
          photo.id && typeof photo.id === "string" ? photo.id : newId("ph"),
        url,
        storage_path: (photo.storage_path ?? "").trim(),
        description: (photo.description ?? "").trim(),
      });
    }
    if (!label && photos.length === 0) continue;
    if (!label) {
      return {
        ok: false,
        error: "Every category needs a label before saving.",
      };
    }
    cleaned.push({ id, label, photos });
  }
  return { ok: true, cleaned };
}

export type SaveExamplePhotosResult =
  | { ok: true; categories: StoredExampleCategory[] }
  | { ok: false; error: string };

export async function saveExamplePhotoCategories(
  brandSlug: string,
  rawCategories: ExampleSaveCategory[],
): Promise<SaveExamplePhotosResult> {
  if (!brandSlug) return { ok: false, error: "Missing brand context." };
  await requireUser();

  const cleaned = cleanCategories(rawCategories);
  if (!cleaned.ok) return cleaned;

  const service = createServiceClient();
  const { data: brand, error: loadErr } = await service
    .from("brands")
    .select("example_photo_categories, reference_image_urls")
    .eq("slug", brandSlug)
    .maybeSingle();
  if (loadErr) return { ok: false, error: loadErr.message };
  if (!brand) return { ok: false, error: "Brand not found." };

  const previous: StoredExampleCategory[] = Array.isArray(
    brand.example_photo_categories,
  )
    ? (brand.example_photo_categories as StoredExampleCategory[])
    : [];

  const keptPaths = new Set(
    cleaned.cleaned.flatMap((c) =>
      c.photos.map((p) => p.storage_path).filter(Boolean),
    ),
  );
  const orphans: string[] = [];
  for (const oldCat of previous) {
    for (const oldPhoto of oldCat.photos ?? []) {
      const path = oldPhoto.storage_path;
      if (path && !keptPaths.has(path)) orphans.push(path);
    }
  }

  // If a saved photo URL was previously held in the legacy reference list,
  // drop it from there so the photo isn't shown twice.
  const keptUrls = new Set(
    cleaned.cleaned.flatMap((c) => c.photos.map((p) => p.url)),
  );
  const oldRefs = (
    Array.isArray(brand.reference_image_urls)
      ? (brand.reference_image_urls as unknown[])
      : []
  ).filter((u): u is string => typeof u === "string");
  const newRefs = oldRefs.filter((u) => !keptUrls.has(u));

  const { error: updateErr } = await service
    .from("brands")
    .update({
      example_photo_categories: cleaned.cleaned,
      reference_image_urls: newRefs,
    })
    .eq("slug", brandSlug);
  if (updateErr) return { ok: false, error: updateErr.message };

  if (orphans.length > 0) {
    try {
      await service.storage.from("article-images").remove(orphans);
    } catch {
      /* best-effort — DB is the source of truth */
    }
  }

  revalidatePath(`/brands/${brandSlug}/profile`);
  return { ok: true, categories: cleaned.cleaned };
}

export type DescribeResult =
  | { ok: true; description: string; cached: boolean }
  | { ok: false; error: string };

export async function addPhotoToCategory(
  brandSlug: string,
  categoryId: string,
  categoryLabel: string,
  photo: { url: string; storage_path: string; description: string },
): Promise<
  | { ok: true; categoryId: string; photoId: string }
  | { ok: false; error: string }
> {
  if (!brandSlug) return { ok: false, error: "Missing brand context." };
  const trimmedLabel = (categoryLabel ?? "").trim() || "Uncategorized";
  if (!photo.url) return { ok: false, error: "Photo URL missing." };
  await requireUser();

  const service = createServiceClient();
  const { data: brand, error: loadErr } = await service
    .from("brands")
    .select("example_photo_categories, reference_image_urls")
    .eq("slug", brandSlug)
    .maybeSingle();
  if (loadErr) return { ok: false, error: loadErr.message };
  if (!brand) return { ok: false, error: "Brand not found." };

  const categories: StoredExampleCategory[] = Array.isArray(
    brand.example_photo_categories,
  )
    ? (brand.example_photo_categories as StoredExampleCategory[])
    : [];

  let cat = categories.find((c) => c.id === categoryId);
  if (!cat) {
    cat = categories.find(
      (c) => c.label.toLowerCase() === trimmedLabel.toLowerCase(),
    );
  }
  let resolvedCategoryId: string;
  if (cat) {
    if (cat.label !== trimmedLabel) cat.label = trimmedLabel;
    resolvedCategoryId = cat.id;
  } else {
    const newCat: StoredExampleCategory = {
      id: categoryId && !categoryId.startsWith("_") ? categoryId : newId("cat"),
      label: trimmedLabel,
      photos: [],
    };
    categories.push(newCat);
    cat = newCat;
    resolvedCategoryId = newCat.id;
  }

  const existing = cat.photos.find((p) => p.url === photo.url);
  let resolvedPhotoId: string;
  if (existing) {
    resolvedPhotoId = existing.id;
    if (existing.description !== photo.description) {
      existing.description = photo.description;
    }
    if (!existing.storage_path && photo.storage_path) {
      existing.storage_path = photo.storage_path;
    }
  } else {
    const newPhoto: StoredExamplePhoto = {
      id: newId("ph"),
      url: photo.url,
      storage_path: photo.storage_path,
      description: photo.description,
    };
    cat.photos.push(newPhoto);
    resolvedPhotoId = newPhoto.id;
  }

  // If this URL was previously in the legacy flat list, drop it from there.
  const oldRefs = (
    Array.isArray(brand.reference_image_urls)
      ? (brand.reference_image_urls as unknown[])
      : []
  ).filter((u): u is string => typeof u === "string");
  const newRefs = oldRefs.filter((u) => u !== photo.url);

  const { error: updateErr } = await service
    .from("brands")
    .update({
      example_photo_categories: categories,
      reference_image_urls: newRefs,
    })
    .eq("slug", brandSlug);
  if (updateErr) return { ok: false, error: updateErr.message };

  revalidatePath(`/brands/${brandSlug}/profile`);
  return { ok: true, categoryId: resolvedCategoryId, photoId: resolvedPhotoId };
}

export async function persistPhotoDescription(
  brandSlug: string,
  photoUrl: string,
  description: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!brandSlug || !photoUrl) {
    return { ok: false, error: "Missing brand or photo URL." };
  }
  await requireUser();
  const service = createServiceClient();
  const { data: brand } = await service
    .from("brands")
    .select("example_photo_categories")
    .eq("slug", brandSlug)
    .maybeSingle();
  if (!brand) return { ok: false, error: "Brand not found." };
  const categories: StoredExampleCategory[] = Array.isArray(
    brand.example_photo_categories,
  )
    ? (brand.example_photo_categories as StoredExampleCategory[])
    : [];

  let touched = false;
  for (const cat of categories) {
    for (const photo of cat.photos) {
      if (photo.url === photoUrl) {
        photo.description = (description ?? "").trim();
        touched = true;
      }
    }
  }
  if (!touched) {
    return {
      ok: false,
      error: "Photo not found yet. Save the section once and try again.",
    };
  }

  const { error } = await service
    .from("brands")
    .update({ example_photo_categories: categories })
    .eq("slug", brandSlug);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/brands/${brandSlug}/profile`);
  return { ok: true };
}

export async function describeImageByUrl(
  brandSlug: string,
  imageUrl: string,
): Promise<{ ok: true; description: string } | { ok: false; error: string }> {
  if (!brandSlug || !imageUrl) {
    return { ok: false, error: "Missing brand or image URL." };
  }
  await requireUser();
  const service = createServiceClient();
  const { data: brand } = await service
    .from("brands")
    .select("id")
    .eq("slug", brandSlug)
    .maybeSingle();
  if (!brand) return { ok: false, error: "Brand not found." };
  try {
    const description = await describeImageFromUrl(
      brand.id as string,
      imageUrl,
    );
    return { ok: true, description };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Describe failed.",
    };
  }
}

export async function describeExamplePhoto(
  brandSlug: string,
  categoryId: string,
  photoId: string,
  forceRegenerate: boolean,
): Promise<DescribeResult> {
  if (!brandSlug) return { ok: false, error: "Missing brand context." };
  await requireUser();

  const service = createServiceClient();
  const { data: brand } = await service
    .from("brands")
    .select("id, example_photo_categories")
    .eq("slug", brandSlug)
    .maybeSingle();
  if (!brand) return { ok: false, error: "Brand not found." };

  const categories: StoredExampleCategory[] = Array.isArray(
    brand.example_photo_categories,
  )
    ? (brand.example_photo_categories as StoredExampleCategory[])
    : [];

  const cat = categories.find((c) => c.id === categoryId);
  if (!cat) return { ok: false, error: "Category not found." };
  const photo = cat.photos.find((p) => p.id === photoId);
  if (!photo) return { ok: false, error: "Photo not found." };

  if (
    !forceRegenerate &&
    photo.description &&
    photo.description.trim().length > 0
  ) {
    return { ok: true, description: photo.description, cached: true };
  }

  let description: string;
  try {
    description = await describeImageFromUrl(brand.id as string, photo.url);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Describe failed.",
    };
  }

  photo.description = description;
  const { error } = await service
    .from("brands")
    .update({ example_photo_categories: categories })
    .eq("slug", brandSlug);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/brands/${brandSlug}/profile`);
  return { ok: true, description, cached: false };
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
