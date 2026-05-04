// v0.4 disk migration: move singleton brand/ + knowledge/ into per-brand dirs.
// Idempotent — running twice is a no-op once everything is in brands/<slug>/.

import fs from "node:fs";
import path from "node:path";
import kleur from "kleur";
import { brandDir, brandsRoot, knowledgeDir, slugify } from "./brand-paths.js";

type Result = { migrated: boolean; slug: string | null; notes: string[] };

export function runV04DiskMigration(repo: string): Result {
  const notes: string[] = [];
  const oldBrandDir = path.join(repo, "brand");
  const oldKnowledgeDir = path.join(repo, "knowledge");
  const oldBrandJson = path.join(oldBrandDir, "brand.json");

  const brandsDir = brandsRoot(repo);
  const hasNewLayout = fs.existsSync(brandsDir) && fs.readdirSync(brandsDir).length > 0;

  if (hasNewLayout) {
    notes.push("brands/ already exists; skipping disk migration.");
    return { migrated: false, slug: null, notes };
  }

  let slug = "default";
  if (fs.existsSync(oldBrandJson)) {
    try {
      const raw = JSON.parse(fs.readFileSync(oldBrandJson, "utf8"));
      slug = slugify(raw?.name);
    } catch {
      notes.push("Could not parse brand/brand.json; using 'default' slug.");
    }
  } else {
    notes.push("No brand/brand.json found; using 'default' slug.");
  }

  const targetBrandDir = brandDir(repo, slug);
  fs.mkdirSync(targetBrandDir, { recursive: true });

  if (fs.existsSync(oldBrandDir)) {
    moveContents(oldBrandDir, targetBrandDir, notes);
    rmdirIfEmpty(oldBrandDir);
  }

  if (fs.existsSync(oldKnowledgeDir)) {
    const targetKnowledge = knowledgeDir(repo, slug);
    fs.mkdirSync(targetKnowledge, { recursive: true });
    moveContents(oldKnowledgeDir, targetKnowledge, notes);
    rmdirIfEmpty(oldKnowledgeDir);
  }

  notes.push(`Brand assets now live at brands/${slug}/`);
  return { migrated: true, slug, notes };
}

function moveContents(srcDir: string, dstDir: string, notes: string[]): void {
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name);
    const dst = path.join(dstDir, entry.name);
    if (fs.existsSync(dst)) {
      notes.push(`Skipped ${path.relative(path.dirname(srcDir), src)} — destination already exists.`);
      continue;
    }
    fs.renameSync(src, dst);
  }
}

function rmdirIfEmpty(dir: string): void {
  try {
    if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
  } catch {
    /* ignore */
  }
}

export function reportV04Migration(result: Result): void {
  if (!result.migrated && result.notes.length === 1 && result.notes[0]?.startsWith("brands/ already")) {
    return;
  }
  console.log("");
  console.log(kleur.bold("v0.4 disk migration:"));
  for (const n of result.notes) {
    console.log("  " + kleur.dim(n));
  }
}
