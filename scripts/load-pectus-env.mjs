/* Shared env loader for any Pectus app whose runtime needs Supabase or
 * other secrets at server-start time. The canonical Pectus env file lives
 * at cms/.env.local because Next.js (the CMS) reads that path natively
 * and the CLI's `pectus connect <service>` writes there. Other apps
 * (Astro content-hub, future apps with their own dev server) call
 * loadPectusEnv() from their config so they read the same file.
 *
 * Plain .mjs with zero deps — importable from any app config without a
 * build step. Falls back to repo-root and per-app .env.local so existing
 * installs and one-off overrides keep working. */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

function parseEnvFile(file) {
  const out = {};
  const raw = fs.readFileSync(file, "utf8");
  for (const line of raw.split(/\r?\n/)) {
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

/* Load Pectus env into process.env. Existing process.env keys win, so
 * callers can override individual values without editing the file.
 *
 * options.appDir — pass `path.dirname(fileURLToPath(import.meta.url))`
 *   from the caller to also pick up a per-app .env.local override. */
export function loadPectusEnv(options = {}) {
  const candidates = [
    path.resolve(repoRoot, "cms/.env.local"),
    path.resolve(repoRoot, ".env.local"),
  ];
  if (options.appDir) {
    candidates.push(path.resolve(options.appDir, ".env.local"));
  }

  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const env = parseEnvFile(file);
    for (const [key, val] of Object.entries(env)) {
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}
