"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getBrandBySlug } from "@/lib/active-brand";
import { createServiceClient } from "@pectus/supabase";
import {
  generateImage,
  getBrandImageGenKey,
  type ImageRef,
  MissingImageGenKeyError,
} from "@/lib/image-generation";
import type { Camera } from "@/lib/brand-types";

type ParentParams = { brandSlug: string; code: string };

async function resolveProject(
  params: ParentParams,
): Promise<{ brandId: string; projectId: string }> {
  const brand = await getBrandBySlug(params.brandSlug);
  const { supabase } = await requireUser();
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("brand_id", brand.id)
    .eq("code", params.code)
    .maybeSingle();
  if (!project) throw new Error(`Project ${params.code} not found.`);
  return { brandId: brand.id, projectId: project.id };
}

// ──────────────────────────────────────────────────────────────────────────
// Article basics + blocks
// ──────────────────────────────────────────────────────────────────────────

export async function updateArticleBasics(formData: FormData): Promise<void> {
  const brandSlug = String(formData.get("brand_slug") ?? "");
  const code = String(formData.get("code") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!brandSlug || !code || !id) return;

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const author = String(formData.get("author") ?? "").trim();
  const authorImage = String(formData.get("author_image") ?? "").trim();

  const { projectId } = await resolveProject({ brandSlug, code });
  const { supabase } = await requireUser();

  await supabase
    .from("articles")
    .update({
      title: title || null,
      description: description || null,
      category: category || null,
      author: author || null,
      author_image: authorImage || null,
    })
    .eq("project_id", projectId)
    .eq("id", id);

  revalidatePath(
    `/brands/${brandSlug}/projects/${code}/apps/content-hub/articles`,
  );
}

type BlockShape = {
  type: string;
  text?: string;
  src?: string;
  alt?: string;
  prompt?: string;
  items?: string[];
};

export async function updateArticleBlocks(formData: FormData): Promise<void> {
  const brandSlug = String(formData.get("brand_slug") ?? "");
  const code = String(formData.get("code") ?? "");
  const id = String(formData.get("id") ?? "");
  const blocksRaw = String(formData.get("blocks") ?? "[]");
  if (!brandSlug || !code || !id) return;

  let blocks: BlockShape[] = [];
  try {
    const parsed = JSON.parse(blocksRaw);
    if (Array.isArray(parsed)) blocks = parsed;
  } catch {
    return;
  }

  const wordCount = blocks.reduce((sum, b) => {
    if (b.type === "p" && typeof b.text === "string") {
      return sum + b.text.split(/\s+/).filter(Boolean).length;
    }
    return sum;
  }, 0);

  const { projectId } = await resolveProject({ brandSlug, code });
  const { supabase } = await requireUser();

  await supabase
    .from("articles")
    .update({
      blocks,
      word_count: wordCount,
      date_modified: new Date().toISOString(),
    })
    .eq("project_id", projectId)
    .eq("id", id);

  revalidatePath(
    `/brands/${brandSlug}/projects/${code}/apps/content-hub/articles`,
  );
}

export async function setArticleStatus(formData: FormData): Promise<void> {
  const brandSlug = String(formData.get("brand_slug") ?? "");
  const code = String(formData.get("code") ?? "");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "").trim();
  if (!brandSlug || !code || !id || !status) return;

  const { projectId } = await resolveProject({ brandSlug, code });
  const { supabase } = await requireUser();

  const update: Record<string, unknown> = { status };
  if (status === "published") {
    update.date_published = new Date().toISOString();
  }

  await supabase
    .from("articles")
    .update(update)
    .eq("project_id", projectId)
    .eq("id", id);

  revalidatePath(
    `/brands/${brandSlug}/projects/${code}/apps/content-hub/articles`,
  );
}

import {
  ALLOWED_TRANSITIONS,
  isStatus,
  type ArticleStatus,
} from "@/lib/article-status";

export type TransitionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function transitionArticleStatus(
  brandSlug: string,
  code: string,
  articleId: string,
  toStatus: string,
  note: string,
): Promise<TransitionResult> {
  if (!brandSlug || !code || !articleId) {
    return { ok: false, error: "Missing project or article context." };
  }
  if (!isStatus(toStatus)) {
    return { ok: false, error: `Unknown status: ${toStatus}` };
  }
  const { user } = await requireUser();
  const { projectId } = await resolveProject({ brandSlug, code });
  const service = createServiceClient();

  const { data: article } = await service
    .from("articles")
    .select("status, slug")
    .eq("id", articleId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!article) return { ok: false, error: "Article not found." };

  const fromStatus = (article.status as string | null) ?? "draft";
  if (!isStatus(fromStatus)) {
    return { ok: false, error: `Article is in unknown status: ${fromStatus}` };
  }
  const allowed = ALLOWED_TRANSITIONS[fromStatus as ArticleStatus];
  if (!allowed.some((t) => t.to === toStatus)) {
    return {
      ok: false,
      error: `Can't move from ${fromStatus} to ${toStatus}.`,
    };
  }

  const update: Record<string, unknown> = {
    status: toStatus,
    updated_at: new Date().toISOString(),
  };
  if (toStatus === "published") {
    update.date_published = new Date().toISOString();
  }

  const { error: updateErr } = await service
    .from("articles")
    .update(update)
    .eq("id", articleId);
  if (updateErr) return { ok: false, error: updateErr.message };

  const { error: logErr } = await service.from("article_transitions").insert({
    article_id: articleId,
    from_status: fromStatus,
    to_status: toStatus,
    note: note || null,
    actor: user.id,
  });
  if (logErr) {
    return {
      ok: false,
      error: `Status updated but transition log failed: ${logErr.message}`,
    };
  }

  revalidatePath(
    `/brands/${brandSlug}/projects/${code}/apps/content-hub/articles/${article.slug}`,
  );
  revalidatePath(
    `/brands/${brandSlug}/projects/${code}/apps/content-hub/articles`,
  );
  return { ok: true };
}

// ──────────────────────────────────────────────────────────────────────────
// Hero image
// ──────────────────────────────────────────────────────────────────────────

export type GenerateHeroResult =
  | { ok: true; heroUrl: string }
  | { ok: false; error: string };

export async function generateHeroImage(
  _prev: GenerateHeroResult | null,
  formData: FormData,
): Promise<GenerateHeroResult> {
  try {
    const brandSlug = String(formData.get("brand_slug") ?? "");
    const code = String(formData.get("code") ?? "");
    const id = String(formData.get("id") ?? "");
    const userPrompt = String(formData.get("user_prompt") ?? "").trim();
    const model = String(formData.get("model") ?? "imagen-4");
    const cameraId = String(formData.get("camera_id") ?? "").trim();
    if (!brandSlug || !code || !id) {
      return { ok: false, error: "Missing context (brand/project/article)." };
    }
    if (!userPrompt) {
      return { ok: false, error: "Describe what the image should show first." };
    }

    const brand = await getBrandBySlug(brandSlug);
    const { projectId } = await resolveProject({ brandSlug, code });

    const apiKey = await getBrandImageGenKey(brand.id);
    if (!apiKey) {
      return {
        ok: false,
        error:
          "No Google AI key set for this brand. Add one on the brand profile page.",
      };
    }

    const service = createServiceClient();
    const { data: article } = await service
      .from("articles")
      .select("title, description, slug")
      .eq("project_id", projectId)
      .eq("id", id)
      .maybeSingle();
    if (!article) return { ok: false, error: "Article not found." };

    const cameras = (Array.isArray(brand.cameras) ? brand.cameras : []) as Camera[];
    const camera =
      cameras.find((c) => c.id === cameraId) ??
      cameras.find((c) => c.is_default) ??
      cameras[0] ??
      null;
    const cameraDirection =
      camera?.description?.trim() ||
      brand.image_guidelines_md?.trim() ||
      "Documentary photo realism. 16:9. Soft natural light.";

    const referenceUrls = (
      Array.isArray(brand.reference_image_urls)
        ? (brand.reference_image_urls as string[])
        : []
    ).slice(0, 6);
    const references: ImageRef[] = [];
    if (model === "gemini-3-pro-image-preview") {
      for (const u of referenceUrls) {
        try {
          const r = await fetch(u);
          if (!r.ok) continue;
          const mt = r.headers.get("content-type") || "image/jpeg";
          const b64 = Buffer.from(await r.arrayBuffer()).toString("base64");
          references.push({ mimeType: mt, dataBase64: b64 });
        } catch {
          /* skip broken refs */
        }
      }
    }

    const fullPrompt = [
      `ARTICLE TITLE: ${article.title}`,
      article.description ? `ARTICLE SUMMARY: ${article.description}` : "",
      "",
      "USER DIRECTION:",
      userPrompt,
      "",
      "PHOTOGRAPHY DIRECTION:",
      cameraDirection,
      "",
      "Render at 16:9. Realistic, never stocky. Avoid text overlays.",
    ]
      .filter(Boolean)
      .join("\n");

    const result = await generateImage(fullPrompt, {
      model,
      references,
      apiKey,
    });

    const ts = Date.now();
    const path = `${code}/${article.slug}-hero-${ts}.png`;
    const buffer = Buffer.from(result.dataBase64, "base64");
    const { error: upErr } = await service.storage
      .from("article-images")
      .upload(path, buffer, {
        contentType: result.mimeType,
        upsert: true,
      });
    if (upErr) {
      return { ok: false, error: `Upload failed: ${upErr.message}` };
    }
    const { data: pub } = service.storage
      .from("article-images")
      .getPublicUrl(path);
    const heroUrl = pub.publicUrl;

    await service
      .from("articles")
      .update({ hero_image: heroUrl })
      .eq("project_id", projectId)
      .eq("id", id);

    revalidatePath(
      `/brands/${brandSlug}/projects/${code}/apps/content-hub/articles`,
    );
    return { ok: true, heroUrl };
  } catch (err) {
    if (err instanceof MissingImageGenKeyError) {
      return {
        ok: false,
        error:
          "No Google AI key set for this brand. Add one on the brand profile page.",
      };
    }
    return {
      ok: false,
      error: `Hero generation failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export type SignedUploadResult =
  | { ok: true; path: string; token: string; publicUrl: string }
  | { ok: false; error: string };

function safeFilename(filename: string): string {
  const ext = filename.match(/\.[a-zA-Z0-9]+$/)?.[0] ?? ".jpg";
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext.toLowerCase()}`;
}

export async function createHeroUploadUrl(
  brandSlug: string,
  code: string,
  articleId: string,
  filename: string,
): Promise<SignedUploadResult> {
  if (!brandSlug || !code || !articleId) {
    return { ok: false, error: "Missing context." };
  }
  await requireUser();
  const service = createServiceClient();
  const { projectId } = await resolveProject({ brandSlug, code });
  const { data: article } = await service
    .from("articles")
    .select("slug")
    .eq("project_id", projectId)
    .eq("id", articleId)
    .maybeSingle();
  if (!article) return { ok: false, error: "Article not found." };

  const path = `${code}/${article.slug}-hero-${safeFilename(filename)}`;
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

export async function setHeroImageUrl(
  brandSlug: string,
  code: string,
  articleId: string,
  url: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!brandSlug || !code || !articleId || !url) {
    return { ok: false, error: "Missing context." };
  }
  await requireUser();
  const { projectId } = await resolveProject({ brandSlug, code });
  const service = createServiceClient();
  const { error } = await service
    .from("articles")
    .update({ hero_image: url })
    .eq("project_id", projectId)
    .eq("id", articleId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(
    `/brands/${brandSlug}/projects/${code}/apps/content-hub/articles`,
  );
  return { ok: true };
}

// ──────────────────────────────────────────────────────────────────────────
// Inline body images
// ──────────────────────────────────────────────────────────────────────────

export async function createInlineImageUploadUrl(
  brandSlug: string,
  code: string,
  articleId: string,
  filename: string,
): Promise<SignedUploadResult> {
  if (!brandSlug || !code || !articleId) {
    return { ok: false, error: "Missing context." };
  }
  await requireUser();
  const service = createServiceClient();
  const { projectId } = await resolveProject({ brandSlug, code });
  const { data: article } = await service
    .from("articles")
    .select("slug")
    .eq("project_id", projectId)
    .eq("id", articleId)
    .maybeSingle();
  if (!article) return { ok: false, error: "Article not found." };

  const path = `${code}/${article.slug}-inline-${safeFilename(filename)}`;
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

export type InlineImageResult =
  | { ok: true; src: string }
  | { ok: false; error: string };

export async function generateInlineImage(
  _prev: InlineImageResult | null,
  formData: FormData,
): Promise<InlineImageResult> {
  try {
    const brandSlug = String(formData.get("brand_slug") ?? "");
    const code = String(formData.get("code") ?? "");
    const articleId = String(formData.get("article_id") ?? "");
    const userPrompt = String(formData.get("prompt") ?? "").trim();
    const model = String(formData.get("model") ?? "imagen-4");
    const cameraId = String(formData.get("camera_id") ?? "").trim();
    if (!brandSlug || !code || !articleId) {
      return { ok: false, error: "Missing context." };
    }
    if (!userPrompt) {
      return { ok: false, error: "Describe what the image should show first." };
    }

    const brand = await getBrandBySlug(brandSlug);
    const { projectId } = await resolveProject({ brandSlug, code });

    const apiKey = await getBrandImageGenKey(brand.id);
    if (!apiKey) {
      return {
        ok: false,
        error:
          "No Google AI key set for this brand. Add one on the brand profile page.",
      };
    }

    const service = createServiceClient();
    const { data: article } = await service
      .from("articles")
      .select("slug")
      .eq("project_id", projectId)
      .eq("id", articleId)
      .maybeSingle();
    if (!article) return { ok: false, error: "Article not found." };

    const cameras = (Array.isArray(brand.cameras) ? brand.cameras : []) as Camera[];
    const camera =
      cameras.find((c) => c.id === cameraId) ??
      cameras.find((c) => c.is_default) ??
      cameras[0] ??
      null;
    const cameraDirection =
      camera?.description?.trim() ||
      brand.image_guidelines_md?.trim() ||
      "Documentary photo realism. 16:9. Soft natural light.";

    const referenceUrls = (
      Array.isArray(brand.reference_image_urls)
        ? (brand.reference_image_urls as string[])
        : []
    ).slice(0, 6);
    const references: ImageRef[] = [];
    if (model === "gemini-3-pro-image-preview") {
      for (const u of referenceUrls) {
        try {
          const r = await fetch(u);
          if (!r.ok) continue;
          const mt = r.headers.get("content-type") || "image/jpeg";
          const b64 = Buffer.from(await r.arrayBuffer()).toString("base64");
          references.push({ mimeType: mt, dataBase64: b64 });
        } catch {
          /* skip */
        }
      }
    }

    const fullPrompt = [
      "USER DIRECTION:",
      userPrompt,
      "",
      "PHOTOGRAPHY DIRECTION:",
      cameraDirection,
      "",
      "Render at 16:9. Realistic, never stocky. Avoid text overlays.",
    ].join("\n");

    const result = await generateImage(fullPrompt, {
      model,
      references,
      apiKey,
    });

    const ts = Date.now();
    const path = `${code}/${article.slug}-inline-${ts}.png`;
    const buffer = Buffer.from(result.dataBase64, "base64");
    const { error: upErr } = await service.storage
      .from("article-images")
      .upload(path, buffer, {
        contentType: result.mimeType,
        upsert: true,
      });
    if (upErr) {
      return { ok: false, error: `Upload failed: ${upErr.message}` };
    }
    const { data: pub } = service.storage
      .from("article-images")
      .getPublicUrl(path);

    return { ok: true, src: pub.publicUrl };
  } catch (err) {
    if (err instanceof MissingImageGenKeyError) {
      return {
        ok: false,
        error:
          "No Google AI key set for this brand. Add one on the brand profile page.",
      };
    }
    return {
      ok: false,
      error: `Inline image generation failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
