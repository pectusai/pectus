"use server";

import fs from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";

export type BrandColors = {
  accent: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
};

export type FontSlot = {
  source: "system" | "google" | "uploaded";
  family: string;
  google_url: string | null;
  files: string[] | null;
};

export type BrandFonts = { heading: FontSlot; body: FontSlot };

export type BrandJson = {
  $schema?: string;
  name: string;
  tagline: string;
  website_url: string;
  sitemap_url: string;
  logo: string;
  colors: BrandColors;
  fonts: BrandFonts;
  voice: string;
  tonality: string;
  guidelines: string;
  image_model: string;
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
  },
  fonts: {
    heading: { source: "system", family: "system-ui", google_url: null, files: null },
    body: { source: "system", family: "system-ui", google_url: null, files: null },
  },
  voice: "",
  tonality: "",
  guidelines: "./guidelines.md",
  image_model: "imagen-4",
};

const BRAND_JSON_PATH = path.resolve(
  process.cwd(),
  "..",
  "brand",
  "brand.json",
);

async function readBrandJson(): Promise<BrandJson> {
  try {
    const raw = await fs.readFile(BRAND_JSON_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_BRAND, ...parsed };
  } catch {
    return DEFAULT_BRAND;
  }
}

async function writeBrandJson(next: BrandJson): Promise<void> {
  await fs.mkdir(path.dirname(BRAND_JSON_PATH), { recursive: true });
  await fs.writeFile(
    BRAND_JSON_PATH,
    JSON.stringify(next, null, 2) + "\n",
    "utf8",
  );
}

export async function loadBrand(): Promise<BrandJson> {
  return readBrandJson();
}

export type SaveBrandResult =
  | { ok: true; brand: BrandJson }
  | { ok: false; error: string };

export async function saveBrand(formData: FormData): Promise<SaveBrandResult> {
  const { supabase, user } = await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const tagline = String(formData.get("tagline") ?? "").trim();
  const website_url = String(formData.get("website_url") ?? "").trim();
  const sitemap_url = String(formData.get("sitemap_url") ?? "").trim();
  const voice = String(formData.get("voice") ?? "").trim();
  const tonality = String(formData.get("tonality") ?? "").trim();
  const guidelines_md = String(formData.get("guidelines_md") ?? "").trim();
  const image_model =
    String(formData.get("image_model") ?? "imagen-4").trim() || "imagen-4";

  const colors: BrandColors = {
    accent: String(formData.get("color_accent") ?? "#2563eb").trim(),
    surface: String(formData.get("color_surface") ?? "#ffffff").trim(),
    text: String(formData.get("color_text") ?? "#0a0a0a").trim(),
    muted: String(formData.get("color_muted") ?? "#6b7280").trim(),
    border: String(formData.get("color_border") ?? "#e5e7eb").trim(),
  };

  const fonts: BrandFonts = {
    heading: parseFontSlot(formData, "heading"),
    body: parseFontSlot(formData, "body"),
  };

  const current = await readBrandJson();
  const next: BrandJson = {
    ...current,
    name: name || current.name,
    tagline,
    website_url,
    sitemap_url,
    colors,
    fonts,
    voice,
    tonality,
    image_model,
  };

  /* Persist to brand_profile (singleton) for runtime use across the CMS. */
  const { error } = await supabase
    .from("brand_profile")
    .upsert(
      {
        singleton: true,
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
        updated_by: user.id,
      },
      { onConflict: "singleton" },
    );

  if (error) {
    return { ok: false, error: `Database save failed: ${error.message}` };
  }

  /* Mirror to brand/brand.json so the public hub-template, CLI, and skills
   * can read brand config without going through Supabase. */
  try {
    await writeBrandJson(next);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: `Saved to database, but writing brand/brand.json failed: ${msg}`,
    };
  }

  revalidatePath("/brand");
  return { ok: true, brand: next };
}

function parseFontSlot(formData: FormData, prefix: string): FontSlot {
  const sourceRaw = String(formData.get(`${prefix}_source`) ?? "system").trim();
  const source: FontSlot["source"] =
    sourceRaw === "google" || sourceRaw === "uploaded" ? sourceRaw : "system";
  const family =
    String(formData.get(`${prefix}_family`) ?? "").trim() || "system-ui";
  const googleUrl = String(formData.get(`${prefix}_google_url`) ?? "").trim();

  /* Uploaded files are out of scope for the plumbing PR — we accept the slot
   * but don't persist binary uploads here. Future work: signed Supabase
   * upload URL + populate `files`. */
  return {
    source,
    family,
    google_url: source === "google" && googleUrl ? googleUrl : null,
    files: null,
  };
}
