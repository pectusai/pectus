// Read and merge-write .env.local. The canonical location is cms/.env.local
// — that is what Next.js reads when the dev server boots. The CLI follows
// suit so both consumers see the same file. For backward compat with older
// installs that wrote to the repo root, fall back to <root>/.env.local on
// read; on write always target cms/.env.local.
//
// Preserves existing keys, comments, and ordering; appends new keys at the end.

import fs from "node:fs";
import path from "node:path";
import { findRepoRoot } from "./repo-root.js";

function envPath(): string {
  return path.join(findRepoRoot(), "cms", ".env.local");
}

function legacyEnvPath(): string {
  return path.join(findRepoRoot(), ".env.local");
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
  const raw = fs.readFileSync(file, "utf8");
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    // Strip surrounding quotes if present.
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

export function writeEnvLocal(updates: Record<string, string>): void {
  const file = envPath();
  // Make sure cms/ exists before writing into it.
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // If a legacy <root>/.env.local exists and the canonical cms/.env.local
  // does not, migrate the legacy file's contents over before merging updates.
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

  // Make sure the file ends with a newline.
  let content = out.join("\n");
  if (!content.endsWith("\n")) content += "\n";
  fs.writeFileSync(file, content, "utf8");
}

function formatVal(v: string): string {
  if (v === "") return "";
  // Quote when value contains whitespace, # or =.
  if (/\s|#|=/u.test(v)) return `"${v.replace(/"/gu, '\\"')}"`;
  return v;
}
