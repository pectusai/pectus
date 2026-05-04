"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { brandJsonPath, importsDir } from "@/lib/brand-paths";
import {
  importDesign,
  timestampDir,
  type BrandDraft,
} from "@pectus/cli/import-design";

export type BrandColors = {
  accent: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  accent_alt: string | null;
  accent_alt_ink: string | null;
  surface_alt: string | null;
  surface_inv: string | null;
  ok: string | null;
  warn: string | null;
  err: string | null;
};

export type FontSlot = {
  source: "system" | "google" | "uploaded";
  family: string;
  google_url: string | null;
  files: string[] | null;
};

export type BrandFonts = { heading: FontSlot; body: FontSlot; mono: FontSlot };

export type BrandRadius = "sharp" | "default" | "soft";

export type ImportedFrom = {
  source: "claude-design";
  url: string;
  imported_at: string;
  bundle_path: string;
};

export type BrandJson = {
  $schema?: string;
  name: string;
  tagline: string;
  website_url: string;
  sitemap_url: string;
  logo: string;
  colors: BrandColors;
  fonts: BrandFonts;
  radius: BrandRadius;
  voice: string;
  tonality: string;
  guidelines: string;
  image_model: string;
  imported_from: ImportedFrom | null;
};

const DEFAULT_FONT_SYSTEM: FontSlot = {
  source: "system",
  family: "system-ui",
  google_url: null,
  files: null,
};

const DEFAULT_FONT_MONO: FontSlot = {
  source: "system",
  family: "ui-monospace, monospace",
  google_url: null,
  files: null,
};

const DEFAULT_BRAND: BrandJson = {
  $schema: "https://pectus.ai/schemas/brand.schema.json",
  name: "Your Brand",
  tagline: "",
  website_url: "",
  sitemap_url: "",
  logo: "./logo.svg",
  colors: {
    accent: "#2563eb",
    surface: "#ffffff",
    text: "#0a0a0a",
    muted: "#6b7280",
    border: "#e5e7eb",
    accent_alt: null,
    accent_alt_ink: null,
    surface_alt: null,
    surface_inv: null,
    ok: null,
    warn: null,
    err: null,
  },
  fonts: {
    heading: { ...DEFAULT_FONT_SYSTEM },
    body: { ...DEFAULT_FONT_SYSTEM },
    mono: { ...DEFAULT_FONT_MONO },
  },
  radius: "default",
  voice: "",
  tonality: "",
  guidelines: "./guidelines.md",
  image_model: "imagen-4",
  imported_from: null,
};

async function readBrandJson(slug: string): Promise<BrandJson> {
  try {
    const raw = await fs.readFile(brandJsonPath(slug), "utf8");
    const parsed = JSON.parse(raw);
    /* Merge nested shape so older brand.json files (pre-Advanced) still
     * surface every required key with a sensible default. */
    return {
      ...DEFAULT_BRAND,
      ...parsed,
      colors: { ...DEFAULT_BRAND.colors, ...(parsed.colors ?? {}) },
      fonts: {
        heading: { ...DEFAULT_BRAND.fonts.heading, ...(parsed.fonts?.heading ?? {}) },
        body: { ...DEFAULT_BRAND.fonts.body, ...(parsed.fonts?.body ?? {}) },
        mono: { ...DEFAULT_BRAND.fonts.mono, ...(parsed.fonts?.mono ?? {}) },
      },
    };
  } catch {
    return DEFAULT_BRAND;
  }
}

async function writeBrandJson(slug: string, next: BrandJson): Promise<void> {
  const target = brandJsonPath(slug);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, JSON.stringify(next, null, 2) + "\n", "utf8");
}

export async function loadBrand(slug: string): Promise<BrandJson> {
  return readBrandJson(slug);
}

export type SaveBrandResult =
  | { ok: true; brand: BrandJson }
  | { ok: false; error: string };

export async function saveBrand(formData: FormData): Promise<SaveBrandResult> {
  const { supabase, user } = await requireAdmin();

  const slug = String(formData.get("brand_slug") ?? "").trim();
  if (!slug) {
    return { ok: false, error: "Missing brand_slug." };
  }

  const { data: existing } = await supabase
    .from("brands")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (!existing) {
    return { ok: false, error: `No brand found for slug "${slug}".` };
  }

  const name = String(formData.get("name") ?? "").trim();
  const tagline = String(formData.get("tagline") ?? "").trim();
  const website_url = String(formData.get("website_url") ?? "").trim();
  const sitemap_url = String(formData.get("sitemap_url") ?? "").trim();
  const voice = String(formData.get("voice") ?? "").trim();
  const tonality = String(formData.get("tonality") ?? "").trim();
  const guidelines_md = String(formData.get("guidelines_md") ?? "").trim();
  const image_model =
    String(formData.get("image_model") ?? "imagen-4").trim() || "imagen-4";
  const radius = parseRadius(String(formData.get("radius") ?? "default"));

  const colors: BrandColors = {
    accent: String(formData.get("color_accent") ?? "#2563eb").trim(),
    surface: String(formData.get("color_surface") ?? "#ffffff").trim(),
    text: String(formData.get("color_text") ?? "#0a0a0a").trim(),
    muted: String(formData.get("color_muted") ?? "#6b7280").trim(),
    border: String(formData.get("color_border") ?? "#e5e7eb").trim(),
    accent_alt: optionalHex(formData.get("color_accent_alt")),
    accent_alt_ink: optionalHex(formData.get("color_accent_alt_ink")),
    surface_alt: optionalHex(formData.get("color_surface_alt")),
    surface_inv: optionalHex(formData.get("color_surface_inv")),
    ok: optionalHex(formData.get("color_ok")),
    warn: optionalHex(formData.get("color_warn")),
    err: optionalHex(formData.get("color_err")),
  };

  const fonts: BrandFonts = {
    heading: parseFontSlot(formData, "heading"),
    body: parseFontSlot(formData, "body"),
    mono: parseFontSlot(formData, "mono"),
  };

  const importedFromRaw = String(formData.get("imported_from") ?? "").trim();
  const importedFrom = parseImportedFrom(importedFromRaw);

  const current = await readBrandJson(slug);
  const next: BrandJson = {
    ...current,
    name: name || current.name,
    tagline,
    website_url,
    sitemap_url,
    colors,
    fonts,
    radius,
    voice,
    tonality,
    image_model,
    imported_from: importedFrom ?? current.imported_from,
  };

  const payload = {
    name,
    tagline: tagline || null,
    website_url: website_url || null,
    sitemap_url: sitemap_url || null,
    voice: voice || null,
    tonality: tonality || null,
    guidelines_md: guidelines_md || null,
    image_model,
    colors,
    fonts,
    accent_alt: colors.accent_alt,
    accent_alt_ink: colors.accent_alt_ink,
    surface_alt: colors.surface_alt,
    surface_inv: colors.surface_inv,
    color_ok: colors.ok,
    color_warn: colors.warn,
    color_err: colors.err,
    font_mono: fonts.mono,
    radius,
    imported_from: next.imported_from ?? null,
    updated_by: user.id,
  };

  const { error } = await supabase
    .from("brands")
    .update(payload)
    .eq("id", existing.id);

  if (error) {
    return { ok: false, error: `Database save failed: ${error.message}` };
  }

  try {
    await writeBrandJson(slug, next);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: `Saved to database, but writing brand.json failed: ${msg}`,
    };
  }

  revalidatePath(`/brands/${slug}/profile`);
  return { ok: true, brand: next };
}

export type ImportDraft = {
  name: string;
  tagline: string;
  voice: string;
  tonality: string;
  guidelines_md: string;
  colors: BrandColors;
  fonts: BrandFonts;
  radius: BrandRadius;
};

export type ImportBrandResult =
  | {
      ok: true;
      draft: ImportDraft;
      missing: string[];
      bundlePath: string;
      url: string;
      importedFrom: ImportedFrom;
    }
  | { ok: false; error: string };

export async function importBrandFromUrl(
  formData: FormData,
): Promise<ImportBrandResult> {
  await requireAdmin();

  const slug = String(formData.get("brand_slug") ?? "").trim();
  if (!slug) {
    return { ok: false, error: "Missing brand_slug." };
  }

  const input = String(formData.get("input") ?? "").trim();
  if (!input) {
    return { ok: false, error: "Paste a Claude Design URL to continue." };
  }

  const stamp = timestampDir();
  const bundleDestDir = path.join(importsDir(slug), stamp);

  const result = await importDesign(input, { bundleDestDir });
  if (!result.ok) {
    const err = result.error;
    const message =
      err.kind === "fetch-failed"
        ? `Couldn't fetch ${err.url}. The bundle may have expired. Try a different URL.`
        : err.kind === "extract-failed"
          ? `Fetched the bundle, but couldn't extract brand fields. ${err.message}`
          : err.kind === "schema-invalid"
            ? `Extraction returned an unexpected shape: ${err.details.join("; ")}`
            : err.kind === "unzip-failed"
              ? `Couldn't unzip the bundle: ${err.message}`
              : err.message;
    return { ok: false, error: message };
  }

  const current = await readBrandJson(slug);
  const draft = mergeDraftForForm(result.draft, current);
  const importedFrom: ImportedFrom = {
    source: "claude-design",
    url: result.url,
    imported_at: new Date().toISOString(),
    bundle_path: result.bundlePath,
  };

  return {
    ok: true,
    draft,
    missing: result.missing,
    bundlePath: result.bundlePath,
    url: result.url,
    importedFrom,
  };
}

function mergeDraftForForm(
  draft: BrandDraft,
  current: BrandJson,
): ImportDraft {
  const colors: BrandColors = {
    accent: draft.colors?.accent ?? current.colors.accent,
    surface: draft.colors?.surface ?? current.colors.surface,
    text: draft.colors?.text ?? current.colors.text,
    muted: draft.colors?.muted ?? current.colors.muted,
    border: draft.colors?.border ?? current.colors.border,
    accent_alt: draft.colors?.accent_alt ?? null,
    accent_alt_ink: draft.colors?.accent_alt_ink ?? null,
    surface_alt: draft.colors?.surface_alt ?? null,
    surface_inv: draft.colors?.surface_inv ?? null,
    ok: draft.colors?.ok ?? null,
    warn: draft.colors?.warn ?? null,
    err: draft.colors?.err ?? null,
  };

  const fonts: BrandFonts = {
    heading: fontSlotFromDraft(draft.fonts?.heading) ?? current.fonts.heading,
    body: fontSlotFromDraft(draft.fonts?.body) ?? current.fonts.body,
    mono: fontSlotFromDraft(draft.fonts?.mono) ?? current.fonts.mono,
  };

  return {
    name: draft.name?.trim() || current.name,
    tagline: draft.tagline?.trim() ?? current.tagline,
    voice: draft.voice?.trim() ?? current.voice,
    tonality: draft.tonality?.trim() ?? current.tonality,
    guidelines_md: draft.guidelines_md?.trim() ?? "",
    colors,
    fonts,
    radius: draft.radius ?? current.radius,
  };
}

function fontSlotFromDraft(
  d: BrandDraft["fonts"]["heading"] | null | undefined,
): FontSlot | null {
  if (!d) return null;
  return {
    source: d.source,
    family: d.family || "system-ui",
    google_url: d.source === "google" ? d.google_url : null,
    files: null,
  };
}

function optionalHex(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/u.test(s) ? s : null;
}

function parseRadius(s: string): BrandRadius {
  return s === "sharp" || s === "soft" ? s : "default";
}

function parseImportedFrom(raw: string): ImportedFrom | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      parsed.source === "claude-design" &&
      typeof parsed.url === "string"
    ) {
      return {
        source: "claude-design",
        url: parsed.url,
        imported_at:
          typeof parsed.imported_at === "string"
            ? parsed.imported_at
            : new Date().toISOString(),
        bundle_path:
          typeof parsed.bundle_path === "string" ? parsed.bundle_path : "",
      };
    }
  } catch {
    // fall through
  }
  return null;
}

function parseFontSlot(formData: FormData, prefix: string): FontSlot {
  const sourceRaw = String(formData.get(`${prefix}_source`) ?? "system").trim();
  const source: FontSlot["source"] =
    sourceRaw === "google" || sourceRaw === "uploaded" ? sourceRaw : "system";
  const family =
    String(formData.get(`${prefix}_family`) ?? "").trim() || "system-ui";
  const googleUrl = String(formData.get(`${prefix}_google_url`) ?? "").trim();

  return {
    source,
    family,
    google_url: source === "google" && googleUrl ? googleUrl : null,
    files: null,
  };
}
