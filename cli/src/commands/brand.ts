// pectus brand — interactive brand setup.
// Two paths: manual (the original wizard) or import-from-Claude-Design (paste a
// handoff URL, let the importer fill brand.json, edit afterwards). Either path
// writes <repo-root>/brands/<slug>/brand.json.

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
  spinner,
} from "@clack/prompts";
import kleur from "kleur";
import { findRepoRoot } from "../lib/repo-root.js";
import { loadEnv } from "../lib/load-env.js";
import { brandDir, importsDir, slugify } from "../lib/brand-paths.js";
import {
  importDesign,
  timestampDir,
  type BrandDraft,
  type FontDraft,
} from "../lib/import-design.js";

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
    accent_alt: string | null;
    accent_alt_ink: string | null;
    surface_alt: string | null;
    surface_inv: string | null;
    ok: string | null;
    warn: string | null;
    err: string | null;
  };
  fonts: { heading: FontDef; body: FontDef; mono: FontDef };
  radius: "sharp" | "default" | "soft";
  voice: string;
  tonality: string;
  guidelines: string;
  image_model: string;
  imported_from: {
    source: "claude-design";
    url: string;
    imported_at: string;
    bundle_path: string;
  } | null;
};

const DEFAULT_COLORS = {
  accent: "#2563eb",
  surface: "#ffffff",
  text: "#0a0a0a",
  muted: "#6b7280",
  border: "#e5e7eb",
};

const DEFAULT_FONT_SYSTEM: FontDef = {
  source: "system",
  family: "system-ui",
  google_url: null,
  files: null,
};

const DEFAULT_FONT_MONO: FontDef = {
  source: "system",
  family: "ui-monospace, monospace",
  google_url: null,
  files: null,
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
  const choice = await select({
    message: `${role === "heading" ? "Heading" : "Body"} font source`,
    options: [
      { value: "system", label: "System (system-ui)" },
      { value: "google", label: "Google Fonts" },
      { value: "uploaded", label: "Uploaded files" },
    ],
    initialValue: "system",
  });
  if (isCancel(choice)) bail();
  const source = choice as FontSource;

  if (source === "system") {
    return { ...DEFAULT_FONT_SYSTEM };
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

export async function sync(): Promise<void> {
  loadEnv();
  const repo = findRepoRoot();
  intro(kleur.bold().bgBlue().white(" Pectus / Brand sync "));

  const { getServiceClient } = await import("../lib/supabase.js");
  const supabase = await getServiceClient();

  const root = path.join(repo, "brands");
  if (!fs.existsSync(root)) {
    cancel(
      `No brands/ folder at ${root}. Run 'npx pectus brand' or write brands/<slug>/brand.json by hand first.`,
    );
    process.exit(1);
  }
  const slugs = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
  if (slugs.length === 0) {
    cancel(`No brand directories under ${root}.`);
    process.exit(1);
  }

  const s = spinner();
  s.start(`Syncing ${slugs.length} brand(s) to Supabase`);
  let synced = 0;
  let skipped = 0;
  for (const slug of slugs) {
    const file = path.join(root, slug, "brand.json");
    if (!fs.existsSync(file)) {
      skipped++;
      continue;
    }
    try {
      const brand = JSON.parse(fs.readFileSync(file, "utf8"));
      const payload: Record<string, unknown> = {
        slug,
        name: brand.name ?? null,
        tagline: brand.tagline ?? null,
        website_url: brand.website_url ?? null,
        sitemap_url: brand.sitemap_url ?? null,
        voice: brand.voice ?? null,
        tonality: brand.tonality ?? null,
        image_model: brand.image_model ?? null,
        colors: brand.colors ?? null,
        fonts: brand.fonts ?? null,
        radius: brand.radius ?? null,
        imported_from: brand.imported_from ?? null,
      };
      const { error } = await supabase
        .from("brands")
        .upsert(payload, { onConflict: "slug" });
      if (error) {
        s.stop(`Brand sync failed for ${slug}.`);
        console.error(kleur.red(`  ${error.message}`));
        process.exit(1);
      }
      synced++;
    } catch (err) {
      s.stop(`Brand sync error for ${slug}.`);
      console.error(
        kleur.red(`  ${err instanceof Error ? err.message : String(err)}`),
      );
      process.exit(1);
    }
  }
  s.stop(`Synced ${synced} brand(s)${skipped ? `, skipped ${skipped}` : ""}.`);
  outro(
    kleur.green(
      `Done. Run 'npx pectus project create' to add a project under one of these brands.`,
    ),
  );
}

export async function run(): Promise<void> {
  loadEnv();
  const repo = findRepoRoot();

  intro(kleur.bold().bgBlue().white(" Pectus brand setup "));

  const mode = await select({
    message: "How would you like to set up your brand?",
    options: [
      {
        value: "manual",
        label: "Manual — enter name, colors, voice etc. step by step (10-15 min)",
      },
      {
        value: "import",
        label: "Import from Claude Design — paste a bundle URL (1 min, edit afterwards)",
      },
    ],
    initialValue: "manual",
  });
  if (isCancel(mode)) bail();

  if (mode === "import") {
    await runImport({ repo });
  } else {
    await runManual({ repo });
  }
}

async function confirmSlug(suggested: string): Promise<string> {
  const v = await text({
    message: "Brand slug (URL-safe id; used for the brands/<slug>/ folder)",
    initialValue: suggested,
    validate(value) {
      if (!value || !value.trim()) return "Slug is required.";
      if (!/^[a-z0-9-]+$/u.test(value.trim())) {
        return "Use lowercase letters, digits, and dashes only.";
      }
      return undefined;
    },
  });
  if (isCancel(v)) bail();
  return (v as string).trim();
}

async function runManual(opts: { repo: string }): Promise<void> {
  const { repo } = opts;

  note(
    "Answers go to brands/<slug>/brand.json. The CMS and every installed app (including the pre-installed content-insights) read from there.",
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

  const slug = await confirmSlug(slugify(name as string));
  const targetBrandDir = brandDir(repo, slug);
  const brandFile = path.join(targetBrandDir, "brand.json");

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
    const dest = path.join(targetBrandDir, `logo${ext}`);
    fs.mkdirSync(targetBrandDir, { recursive: true });
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
      accent_alt: null,
      accent_alt_ink: null,
      surface_alt: null,
      surface_inv: null,
      ok: null,
      warn: null,
      err: null,
    },
    fonts: { heading, body, mono: { ...DEFAULT_FONT_MONO } },
    radius: "default",
    voice: (voice as string) || "",
    tonality: (tonality as string) || "",
    guidelines: "./guidelines.md",
    image_model: imageModel as string,
    imported_from: null,
  };

  fs.mkdirSync(targetBrandDir, { recursive: true });
  fs.writeFileSync(brandFile, `${JSON.stringify(brand, null, 2)}\n`, "utf8");

  outro(
    kleur.green(
      `Brand saved to brands/${slug}/brand.json. Next: npx pectus connect supabase.`,
    ),
  );
}

async function runImport(opts: { repo: string }): Promise<void> {
  const { repo } = opts;

  note(
    "Paste a Claude Design URL (or the full handoff prompt — Pectus will pull the URL out). Pectus will fetch the bundle, ask Claude to extract your brand fields, and save the result. You can edit anything afterwards.",
    "Import from Claude Design",
  );

  const input = await text({
    message: "Claude Design URL or handoff prompt",
    placeholder: "https://api.anthropic.com/v1/design/h/...",
    validate(v) {
      if (!v || !v.trim()) return "Paste a URL to continue.";
      return undefined;
    },
  });
  if (isCancel(input)) bail();

  const stamp = timestampDir();
  // Stage the bundle in a tmp location until we know the brand slug.
  const stagingDir = path.join(repo, ".pectus-tmp", "brand-import", stamp);

  const sp = spinner();
  sp.start("Fetching bundle and extracting brand fields…");
  const result = await importDesign(input as string, { bundleDestDir: stagingDir });
  if (!result.ok) {
    sp.stop("Import failed.");
    const err = result.error;
    const message =
      err.kind === "fetch-failed"
        ? `Couldn't fetch ${err.url}. The bundle may have expired. Try a different URL.`
        : err.kind === "extract-failed"
          ? `Fetched the bundle, but couldn't extract brand fields: ${err.message}`
          : err.kind === "schema-invalid"
            ? `Extraction returned an unexpected shape: ${err.details.join("; ")}`
            : err.kind === "unzip-failed"
              ? `Couldn't unzip the bundle: ${err.message}`
              : err.message;
    cancel(message);
    process.exit(1);
  }
  sp.stop("Bundle imported.");

  const slug = await confirmSlug(slugify(result.draft.name ?? "default"));
  const targetBrandDir = brandDir(repo, slug);
  const brandFile = path.join(targetBrandDir, "brand.json");

  // Move the staged bundle under brands/<slug>/imports/<stamp>/.
  const finalBundleDir = path.join(importsDir(repo, slug), stamp);
  fs.mkdirSync(path.dirname(finalBundleDir), { recursive: true });
  fs.renameSync(stagingDir, finalBundleDir);
  const finalBundlePath = result.bundlePath.replace(stagingDir, finalBundleDir);

  const merged = mergeDraftIntoBrand(result.draft, result.url, finalBundlePath);
  fs.mkdirSync(targetBrandDir, { recursive: true });
  fs.writeFileSync(brandFile, `${JSON.stringify(merged, null, 2)}\n`, "utf8");

  if (result.draft.guidelines_md) {
    fs.writeFileSync(
      path.join(targetBrandDir, "guidelines.md"),
      result.draft.guidelines_md.trim() + "\n",
      "utf8",
    );
  }

  const filled = collectFilledLabels(result.draft);
  const summaryLines = [
    kleur.green("Imported from Claude Design."),
    `  Brand: brands/${slug}/`,
    `  Filled: ${filled.length > 0 ? filled.join(", ") : "(no fields)"}`,
    `  Still needed: ${result.missing.join(", ")}`,
    `  Bundle saved to: ${path.relative(repo, finalBundlePath)}`,
  ];
  outro(summaryLines.join("\n"));
}

function mergeDraftIntoBrand(
  draft: BrandDraft,
  url: string,
  bundlePath: string,
): BrandJson {
  return {
    $schema: "https://pectus.ai/schemas/brand.schema.json",
    name: draft.name?.trim() || "Your Brand",
    tagline: draft.tagline?.trim() ?? "",
    website_url: "",
    sitemap_url: "",
    logo: "./logo.svg",
    colors: {
      accent: draft.colors?.accent ?? DEFAULT_COLORS.accent,
      surface: draft.colors?.surface ?? DEFAULT_COLORS.surface,
      text: draft.colors?.text ?? DEFAULT_COLORS.text,
      muted: draft.colors?.muted ?? DEFAULT_COLORS.muted,
      border: draft.colors?.border ?? DEFAULT_COLORS.border,
      accent_alt: draft.colors?.accent_alt ?? null,
      accent_alt_ink: draft.colors?.accent_alt_ink ?? null,
      surface_alt: draft.colors?.surface_alt ?? null,
      surface_inv: draft.colors?.surface_inv ?? null,
      ok: draft.colors?.ok ?? null,
      warn: draft.colors?.warn ?? null,
      err: draft.colors?.err ?? null,
    },
    fonts: {
      heading: fontFromDraft(draft.fonts?.heading) ?? { ...DEFAULT_FONT_SYSTEM },
      body: fontFromDraft(draft.fonts?.body) ?? { ...DEFAULT_FONT_SYSTEM },
      mono: fontFromDraft(draft.fonts?.mono) ?? { ...DEFAULT_FONT_MONO },
    },
    radius: draft.radius ?? "default",
    voice: draft.voice?.trim() ?? "",
    tonality: draft.tonality?.trim() ?? "",
    guidelines: "./guidelines.md",
    image_model: "imagen-4",
    imported_from: {
      source: "claude-design",
      url,
      imported_at: new Date().toISOString(),
      bundle_path: bundlePath,
    },
  };
}

function fontFromDraft(d: FontDraft | null | undefined): FontDef | null {
  if (!d) return null;
  return {
    source: d.source,
    family: d.family || "system-ui",
    google_url: d.source === "google" ? d.google_url : null,
    files: null,
  };
}

function collectFilledLabels(draft: BrandDraft): string[] {
  const labels: string[] = [];
  if (draft.name) labels.push("name");
  if (draft.tagline) labels.push("tagline");
  if (draft.voice) labels.push("voice");
  if (draft.tonality) labels.push("tonality");
  if (draft.guidelines_md) labels.push("guidelines");
  const basicColors = ["accent", "surface", "text", "muted", "border"].filter(
    (k) => draft.colors?.[k as keyof BrandDraft["colors"]],
  );
  if (basicColors.length > 0) {
    labels.push(`${basicColors.length} basic colors`);
  }
  const advColors = [
    "accent_alt",
    "accent_alt_ink",
    "surface_alt",
    "surface_inv",
    "ok",
    "warn",
    "err",
  ].filter((k) => draft.colors?.[k as keyof BrandDraft["colors"]]);
  if (advColors.length > 0) {
    labels.push(`${advColors.length} advanced colors`);
  }
  if (draft.fonts?.heading) labels.push("heading font");
  if (draft.fonts?.body) labels.push("body font");
  if (draft.fonts?.mono) labels.push("mono font");
  if (draft.radius) labels.push(`radius (${draft.radius})`);
  return labels;
}
