/* Read and merge-write cms/.env.local. Same canonical location the CLI's
 * env-file.ts targets — single source of truth that Next.js auto-loads,
 * the Astro preview reads via scripts/load-pectus-env.mjs, and the CMS
 * settings/environment UI maintains.
 *
 * Preserves existing keys, comments, and ordering; appends new keys at end. */

import fs from "node:fs";
import path from "node:path";

function repoRoot(): string {
  /* Walk up from cwd looking for pectus.md (the install script that lives
   * at the repo root). Works regardless of which directory the CMS was
   * launched from. Falls back to "cwd's parent" if not found. */
  let dir = process.cwd();
  for (let i = 0; i < 10; i += 1) {
    if (fs.existsSync(path.join(dir, "pectus.md"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(process.cwd(), "..");
}

function envPath(): string {
  return path.join(repoRoot(), "cms", ".env.local");
}

function legacyEnvPath(): string {
  return path.join(repoRoot(), ".env.local");
}

export function readEnvLocal(): Record<string, string> {
  const primary = envPath();
  const legacy = legacyEnvPath();
  const file = fs.existsSync(primary)
    ? primary
    : fs.existsSync(legacy)
      ? legacy
      : primary;
  if (!fs.existsSync(file)) return {};
  return parseEnvText(fs.readFileSync(file, "utf8"));
}

export function envFilePath(): string {
  return envPath();
}

export function envFileExists(): boolean {
  return fs.existsSync(envPath()) || fs.existsSync(legacyEnvPath());
}

export function writeEnvLocal(updates: Record<string, string>): void {
  const file = envPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });

  const legacy = legacyEnvPath();
  if (!fs.existsSync(file) && fs.existsSync(legacy)) {
    fs.copyFileSync(legacy, file);
  }

  let lines: string[] = [];
  if (fs.existsSync(file)) {
    lines = fs.readFileSync(file, "utf8").split(/\r?\n/u);
  }

  const remaining = new Map(Object.entries(updates));
  const out: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      out.push(line);
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq <= 0) {
      out.push(line);
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    if (remaining.has(key)) {
      const v = remaining.get(key) ?? "";
      out.push(`${key}=${formatVal(v)}`);
      remaining.delete(key);
    } else {
      out.push(line);
    }
  }

  if (remaining.size > 0) {
    if (out.length > 0 && out[out.length - 1].trim() !== "") out.push("");
    for (const [k, v] of remaining) {
      out.push(`${k}=${formatVal(v)}`);
    }
  }

  let content = out.join("\n");
  if (!content.endsWith("\n")) content += "\n";
  fs.writeFileSync(file, content, "utf8");
}

function parseEnvText(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function formatVal(v: string): string {
  if (v === "") return "";
  if (/\s|#|=/u.test(v)) return `"${v.replace(/"/gu, '\\"')}"`;
  return v;
}
