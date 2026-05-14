/* Read the active brand's brand.json and emit a CSS string that sets the raw
 * `--brand-*` inputs on :root. Consumed by BaseLayout. Null fields are dropped
 * so the fallback in brand-tokens.css applies.
 *
 * Resolution order:
 *   1. PECTUS_BRAND_SLUG env → brands/<slug>/brand.json  (multi-brand build)
 *   2. first directory under brands/ that has brand.json  (single-brand v0.4)
 *   3. brand/brand.json                                   (legacy v0.3 layout)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
/* lib → src → content-hub → apps → repo */
const REPO_ROOT = path.resolve(HERE, "..", "..", "..", "..");

function resolveBrandJsonPath(): string {
  const slug = process.env.PECTUS_BRAND_SLUG?.trim();
  if (slug) {
    const explicit = path.join(REPO_ROOT, "brands", slug, "brand.json");
    if (fs.existsSync(explicit)) return explicit;
  }
  const brandsRoot = path.join(REPO_ROOT, "brands");
  if (fs.existsSync(brandsRoot)) {
    for (const ent of fs.readdirSync(brandsRoot, { withFileTypes: true })) {
      if (!ent.isDirectory()) continue;
      const candidate = path.join(brandsRoot, ent.name, "brand.json");
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return path.join(REPO_ROOT, "brand", "brand.json");
}

const BRAND_JSON_PATH = resolveBrandJsonPath();

type BrandColors = Record<string, string | null | undefined>;
type FontSlot = { family?: string | null; google_url?: string | null };

type BrandShape = {
  colors?: BrandColors;
  fonts?: { heading?: FontSlot; body?: FontSlot; mono?: FontSlot };
  radius?: "sharp" | "default" | "soft";
};

const RADIUS_PX: Record<string, number> = {
  sharp: 0,
  default: 6,
  soft: 12,
};

function readBrand(): BrandShape {
  try {
    return JSON.parse(fs.readFileSync(BRAND_JSON_PATH, "utf8"));
  } catch {
    return {};
  }
}

const COLOR_KEYS = [
  "accent",
  "surface",
  "text",
  "muted",
  "border",
  "accent_alt",
  "accent_alt_ink",
  "surface_alt",
  "surface_inv",
  "ok",
  "warn",
  "err",
];

export function brandTokensCss(): string {
  const brand = readBrand();
  const decls: string[] = [];

  for (const key of COLOR_KEYS) {
    const value = brand.colors?.[key];
    if (typeof value === "string" && value.length > 0) {
      decls.push(`--brand-color-${key.replace(/_/g, "-")}: ${value};`);
    }
  }

  for (const slot of ["heading", "body", "mono"] as const) {
    const family = brand.fonts?.[slot]?.family;
    if (family && family !== "system-ui") {
      decls.push(`--brand-font-${slot}-family: ${family};`);
    }
  }

  const radius = brand.radius;
  if (radius && radius in RADIUS_PX) {
    decls.push(`--brand-radius-value: ${RADIUS_PX[radius]}px;`);
  }

  if (decls.length === 0) return "";
  return `:root{${decls.join("")}}`;
}

export function brandFontLinks(): string[] {
  const brand = readBrand();
  const urls: string[] = [];
  for (const slot of ["heading", "body", "mono"] as const) {
    const url = brand.fonts?.[slot]?.google_url;
    if (typeof url === "string" && url.startsWith("https://")) {
      urls.push(url);
    }
  }
  return Array.from(new Set(urls));
}
