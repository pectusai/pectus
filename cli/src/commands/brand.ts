// pectus brand — interactive brand setup.
// Prompts for brand metadata, colors, voice, fonts, logo.
// Writes <repo-root>/brand/brand.json and copies a logo file if provided.

import fs from "node:fs";
import path from "node:path";
import {
  intro,
  outro,
  text,
  select,
  isCancel,
  cancel,
  note,
} from "@clack/prompts";
import kleur from "kleur";
import { findRepoRoot } from "../lib/repo-root.js";
import { loadEnv } from "../lib/load-env.js";

type FontSource = "system" | "google" | "uploaded";

type FontDef = {
  source: FontSource;
  family: string;
  google_url: string | null;
  files: string[] | null;
};

type BrandJson = {
  $schema: string;
  name: string;
  tagline: string;
  website_url: string;
  sitemap_url: string;
  logo: string;
  colors: {
    accent: string;
    surface: string;
    text: string;
    muted: string;
    border: string;
  };
  fonts: { heading: FontDef; body: FontDef };
  voice: string;
  tonality: string;
  guidelines: string;
  image_model: string;
};

const DEFAULT_COLORS = {
  accent: "#2563eb",
  surface: "#ffffff",
  text: "#0a0a0a",
  muted: "#6b7280",
  border: "#e5e7eb",
};

function isHex(v: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/u.test(v);
}

function bail(): never {
  cancel("Brand setup cancelled.");
  process.exit(1);
}

async function promptHex(label: string, def: string): Promise<string> {
  const v = await text({
    message: `${label} (hex)`,
    initialValue: def,
    validate(value) {
      if (!value || !isHex(value)) return "Use a hex color like #2563eb.";
      return undefined;
    },
  });
  if (isCancel(v)) bail();
  return v as string;
}

async function promptFont(role: "heading" | "body"): Promise<FontDef> {
  const source = await select<FontSource>({
    message: `${role === "heading" ? "Heading" : "Body"} font source`,
    options: [
      { value: "system", label: "System (system-ui)" },
      { value: "google", label: "Google Fonts" },
      { value: "uploaded", label: "Uploaded files" },
    ],
    initialValue: "system",
  });
  if (isCancel(source)) bail();

  if (source === "system") {
    return { source: "system", family: "system-ui", google_url: null, files: null };
  }

  const family = await text({
    message: `${role} font family (e.g. "Inter")`,
    validate(v) {
      if (!v || !v.trim()) return "Family is required.";
      return undefined;
    },
  });
  if (isCancel(family)) bail();

  if (source === "google") {
    const url = await text({
      message: "Google Fonts URL (https://fonts.googleapis.com/css2?family=...)",
      validate(v) {
        if (!v || !v.trim()) return "URL is required.";
        return undefined;
      },
    });
    if (isCancel(url)) bail();
    return {
      source: "google",
      family: family as string,
      google_url: url as string,
      files: null,
    };
  }

  // uploaded
  const filesIn = await text({
    message: "Font file paths (comma separated, .woff2/.woff/.otf/.ttf)",
    placeholder: "./fonts/Brand-Regular.woff2,./fonts/Brand-Bold.woff2",
    validate(v) {
      if (!v || !v.trim()) return "At least one font file path is required.";
      return undefined;
    },
  });
  if (isCancel(filesIn)) bail();
  const files = (filesIn as string)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    source: "uploaded",
    family: family as string,
    google_url: null,
    files,
  };
}

export async function run(): Promise<void> {
  loadEnv();
  const repo = findRepoRoot();
  const brandDir = path.join(repo, "brand");
  const brandFile = path.join(brandDir, "brand.json");

  intro(kleur.bold().bgBlue().white(" Pectus brand setup "));

  note(
    "Answers go to brand/brand.json. The CMS and hub-template both read from there at build time.",
    "What this does",
  );

  const name = await text({
    message: "Brand name",
    placeholder: "Acme Inc.",
    validate(v) {
      if (!v || !v.trim()) return "Brand name is required.";
      return undefined;
    },
  });
  if (isCancel(name)) bail();

  const tagline = await text({
    message: "Tagline (one line, optional)",
    placeholder: "Make work feel less like work.",
  });
  if (isCancel(tagline)) bail();

  const websiteUrl = await text({
    message: "Website URL",
    placeholder: "https://acme.com",
    validate(v) {
      if (!v || !v.trim()) return "Website URL is required.";
      try {
        const u = new URL(v);
        if (!u.protocol.startsWith("http")) return "Use http(s) URL.";
        return undefined;
      } catch {
        return "Use a valid URL.";
      }
    },
  });
  if (isCancel(websiteUrl)) bail();

  const sitemapUrl = await text({
    message: "Sitemap URL",
    placeholder: `${(websiteUrl as string).replace(/\/$/u, "")}/sitemap.xml`,
    initialValue: `${(websiteUrl as string).replace(/\/$/u, "")}/sitemap.xml`,
    validate(v) {
      if (!v || !v.trim()) return "Sitemap URL is required.";
      try {
        new URL(v);
        return undefined;
      } catch {
        return "Use a valid URL.";
      }
    },
  });
  if (isCancel(sitemapUrl)) bail();

  // Colors.
  const accent = await promptHex("Accent color", DEFAULT_COLORS.accent);
  const surface = await promptHex("Surface color", DEFAULT_COLORS.surface);
  const textCol = await promptHex("Text color", DEFAULT_COLORS.text);
  const muted = await promptHex("Muted color", DEFAULT_COLORS.muted);
  const border = await promptHex("Border color", DEFAULT_COLORS.border);

  const voice = await text({
    message: "Voice (a few sentences on how you sound)",
    placeholder: "Plainspoken, confident, never corporate.",
  });
  if (isCancel(voice)) bail();

  const tonality = await text({
    message: "Tonality (when to dial up/down)",
    placeholder: "Warm with prospects, technical with engineers, blunt about pricing.",
  });
  if (isCancel(tonality)) bail();

  const imageModel = await select({
    message: "Default image model",
    options: [
      { value: "imagen-4", label: "imagen-4 (default)" },
      { value: "imagen-4-ultra", label: "imagen-4-ultra" },
      { value: "imagen-4-fast", label: "imagen-4-fast" },
      { value: "flux-1.1-pro", label: "flux-1.1-pro" },
    ],
    initialValue: "imagen-4",
  });
  if (isCancel(imageModel)) bail();

  const heading = await promptFont("heading");
  const body = await promptFont("body");

  const logoIn = await text({
    message: "Logo file path (or leave empty to skip)",
    placeholder: "./assets/logo.svg",
  });
  if (isCancel(logoIn)) bail();

  let logoField = "./logo.svg";
  if ((logoIn as string).trim()) {
    const src = path.resolve(process.cwd(), (logoIn as string).trim());
    if (!fs.existsSync(src)) {
      cancel(`Logo file not found at ${src}.`);
      process.exit(1);
    }
    const ext = path.extname(src) || ".svg";
    const dest = path.join(brandDir, `logo${ext}`);
    fs.mkdirSync(brandDir, { recursive: true });
    fs.copyFileSync(src, dest);
    logoField = `./logo${ext}`;
  }

  const brand: BrandJson = {
    $schema: "https://pectus.ai/schemas/brand.schema.json",
    name: name as string,
    tagline: (tagline as string) || "",
    website_url: websiteUrl as string,
    sitemap_url: sitemapUrl as string,
    logo: logoField,
    colors: {
      accent,
      surface,
      text: textCol,
      muted,
      border,
    },
    fonts: { heading, body },
    voice: (voice as string) || "",
    tonality: (tonality as string) || "",
    guidelines: "./guidelines.md",
    image_model: imageModel as string,
  };

  fs.mkdirSync(brandDir, { recursive: true });
  fs.writeFileSync(brandFile, `${JSON.stringify(brand, null, 2)}\n`, "utf8");

  outro(
    kleur.green("Brand saved to brand/brand.json. Next: npx pectus connect supabase."),
  );
}
