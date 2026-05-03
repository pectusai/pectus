// Pectus brand importer — Claude Design handoff bundles.
//
// Takes a URL (or freeform text containing a URL), fetches the gzipped tarball
// from Anthropic's hosted handoff endpoint, untars it into the caller's chosen
// destination, asks Claude to extract a populated brand draft from the bundle's
// README + chats + tokens.css, and returns the draft + the path the bundle was
// written to.
//
// Used by both the CLI (`pectus brand`, import branch) and the CMS Brand
// page's "Import from Claude Design" button. Caller chooses the bundle dest
// dir (typically `<repo>/brand/imports/<timestamp>/`).

import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import Anthropic from "@anthropic-ai/sdk";
import { buildExtractionPrompt } from "./import-design-prompt";

const execFileAsync = promisify(execFile);

export type FontDraft = {
  source: "system" | "google";
  family: string;
  google_url: string | null;
};

export type BrandDraft = {
  name: string | null;
  tagline: string | null;
  voice: string | null;
  tonality: string | null;
  guidelines_md: string | null;
  colors: {
    accent: string | null;
    surface: string | null;
    text: string | null;
    muted: string | null;
    border: string | null;
    accent_alt: string | null;
    accent_alt_ink: string | null;
    surface_alt: string | null;
    surface_inv: string | null;
    ok: string | null;
    warn: string | null;
    err: string | null;
  };
  fonts: {
    heading: FontDraft | null;
    body: FontDraft | null;
    mono: FontDraft | null;
  };
  radius: "sharp" | "default" | "soft" | null;
};

export type ImportError =
  | { kind: "invalid-input"; message: string }
  | { kind: "fetch-failed"; message: string; url: string }
  | { kind: "unzip-failed"; message: string }
  | { kind: "extract-failed"; message: string }
  | { kind: "schema-invalid"; message: string; details: string[] };

export type ImportResult =
  | { ok: true; draft: BrandDraft; bundlePath: string; missing: string[]; url: string }
  | { ok: false; error: ImportError };

const URL_RE =
  /https:\/\/api\.anthropic\.com\/v1\/design\/h\/[A-Za-z0-9_-]+(?:\?[^\s]*)?/u;

const MODEL = "claude-opus-4-7";

export async function importDesign(
  input: string,
  opts: { bundleDestDir: string; apiKey?: string },
): Promise<ImportResult> {
  const url = parseUrl(input);
  if (!url) {
    return {
      ok: false,
      error: {
        kind: "invalid-input",
        message:
          "Couldn't find a Claude Design URL in the input. Paste a URL like https://api.anthropic.com/v1/design/h/...",
      },
    };
  }

  const fetched = await fetchBundle(url);
  if (!fetched.ok) return fetched;

  const unzipped = await unzipTo(fetched.bytes, opts.bundleDestDir);
  if (!unzipped.ok) return unzipped;

  const sources = await readBundleSources(opts.bundleDestDir);
  if (!sources) {
    return {
      ok: false,
      error: {
        kind: "unzip-failed",
        message: "Bundle contained no readable README/chats/CSS files.",
      },
    };
  }

  const apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: {
        kind: "extract-failed",
        message:
          "ANTHROPIC_API_KEY is not set. Add it to .env.local and try again.",
      },
    };
  }

  const draftResult = await extractDraft(sources, apiKey);
  if (!draftResult.ok) return draftResult;

  const validation = validateDraft(draftResult.draft);
  if (!validation.ok) return validation;

  const missing = collectMissingFields(draftResult.draft);
  return {
    ok: true,
    draft: draftResult.draft,
    bundlePath: opts.bundleDestDir,
    missing,
    url,
  };
}

function parseUrl(input: string): string | null {
  const m = input.match(URL_RE);
  return m ? m[0] : null;
}

async function fetchBundle(
  url: string,
): Promise<
  { ok: true; bytes: Buffer } | { ok: false; error: ImportError }
> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      return {
        ok: false,
        error: {
          kind: "fetch-failed",
          message: `Bundle fetch returned HTTP ${resp.status}. The URL may have expired.`,
          url,
        },
      };
    }
    const bytes = Buffer.from(await resp.arrayBuffer());
    return { ok: true, bytes };
  } catch (err) {
    return {
      ok: false,
      error: {
        kind: "fetch-failed",
        message: err instanceof Error ? err.message : String(err),
        url,
      },
    };
  }
}

async function unzipTo(
  bytes: Buffer,
  destDir: string,
): Promise<{ ok: true } | { ok: false; error: ImportError }> {
  const tempTar = path.join(
    os.tmpdir(),
    `pectus-bundle-${Date.now()}-${process.pid}.tar.gz`,
  );
  try {
    await fs.mkdir(destDir, { recursive: true });
    await fs.writeFile(tempTar, bytes);
    await execFileAsync("tar", ["-xzf", tempTar, "-C", destDir]);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: {
        kind: "unzip-failed",
        message: err instanceof Error ? err.message : String(err),
      },
    };
  } finally {
    await fs.unlink(tempTar).catch(() => {});
  }
}

async function readBundleSources(bundlePath: string): Promise<string | null> {
  const root = await resolveProjectRoot(bundlePath);

  const wanted: RegExp[] = [
    /(^|\/)readme\.md$/iu,
    /(^|\/)chats\/.*\.md$/iu,
    /\.css$/iu,
  ];

  const collected: string[] = [];
  for await (const file of walk(root)) {
    const rel = path.relative(root, file).replace(/\\/g, "/");
    if (!wanted.some((re) => re.test(rel))) continue;
    try {
      const content = await fs.readFile(file, "utf8");
      collected.push(`### ${rel}\n\n${content}`);
    } catch {
      // unreadable; skip
    }
  }

  if (collected.length === 0) return null;
  return collected.join("\n\n---\n\n");
}

async function resolveProjectRoot(bundlePath: string): Promise<string> {
  // Bundles often have a single top-level directory; descend into it so the
  // relative paths line up with the prompt's mapping guidance.
  const entries = await fs.readdir(bundlePath, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory());
  const files = entries.filter((e) => e.isFile());
  if (dirs.length === 1 && files.length === 0) {
    return path.join(bundlePath, dirs[0].name);
  }
  return bundlePath;
}

async function* walk(dir: string): AsyncGenerator<string> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile()) yield full;
  }
}

async function extractDraft(
  bundleContents: string,
  apiKey: string,
): Promise<
  { ok: true; draft: BrandDraft } | { ok: false; error: ImportError }
> {
  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      messages: [
        { role: "user", content: buildExtractionPrompt(bundleContents) },
      ],
    });
    const text = response.content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    const json = extractJson(text);
    if (!json || typeof json !== "object") {
      return {
        ok: false,
        error: {
          kind: "extract-failed",
          message: "Model response did not contain a JSON object.",
        },
      };
    }
    return { ok: true, draft: json as BrandDraft };
  } catch (err) {
    return {
      ok: false,
      error: {
        kind: "extract-failed",
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

function extractJson(text: string): unknown | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/u);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end < 0 || end < start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch {
    return null;
  }
}

function validateDraft(
  draft: BrandDraft,
): { ok: true } | { ok: false; error: ImportError } {
  const details: string[] = [];
  if (typeof draft !== "object" || draft === null) {
    details.push("Top-level value is not an object.");
  } else {
    if (typeof draft.colors !== "object" || draft.colors === null) {
      details.push("Missing or invalid `colors` object.");
    }
    if (typeof draft.fonts !== "object" || draft.fonts === null) {
      details.push("Missing or invalid `fonts` object.");
    }
  }
  if (details.length > 0) {
    return {
      ok: false,
      error: {
        kind: "schema-invalid",
        message: "Extracted draft did not match the expected shape.",
        details,
      },
    };
  }
  return { ok: true };
}

function collectMissingFields(draft: BrandDraft): string[] {
  const missing: string[] = [];
  if (!draft.name) missing.push("name");
  if (!draft.tagline) missing.push("tagline");
  if (!draft.voice) missing.push("voice");
  if (!draft.tonality) missing.push("tonality");
  if (!draft.guidelines_md) missing.push("guidelines");
  // These four are never carried in the bundle.
  missing.push("logo", "image_model", "website_url", "sitemap_url");
  return missing;
}

export function timestampDir(now: Date = new Date()): string {
  // 2026-05-02T18-24-00Z — filesystem-safe and sortable.
  return now.toISOString().replace(/:/g, "-").replace(/\.\d+Z$/u, "Z");
}
