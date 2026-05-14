// pectus doctor — health check.
// Each check prints OK or FAIL. Critical failures exit 1.

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import kleur from "kleur";
import { findRepoRoot } from "../lib/repo-root.js";
import { readEnvLocal } from "../lib/env-file.js";
import { loadEnv } from "../lib/load-env.js";

type Check = {
  label: string;
  ok: boolean;
  detail: string;
  critical: boolean;
};

function runCmd(cmd: string): string | null {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

function parseSemver(v: string): { major: number; minor: number } | null {
  const m = v.match(/(\d+)\.(\d+)(?:\.(\d+))?/u);
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]) };
}

export async function run(): Promise<void> {
  loadEnv();
  const checks: Check[] = [];

  // 1. Node 20.19+ (Vite floor; some deps need >=20.18.1)
  const nodeVer = process.versions.node;
  const nodeParsed = parseSemver(nodeVer);
  const nodeOk =
    !!nodeParsed &&
    (nodeParsed.major > 20 || (nodeParsed.major === 20 && nodeParsed.minor >= 19));
  checks.push({
    label: "Node.js >= 20.19",
    ok: nodeOk,
    detail: `node ${nodeVer}`,
    critical: true,
  });

  // 2. npm 10+
  const npmVer = runCmd("npm --version");
  const npmParsed = npmVer ? parseSemver(npmVer) : null;
  checks.push({
    label: "npm >= 10",
    ok: !!npmParsed && npmParsed.major >= 10,
    detail: npmVer ? `npm ${npmVer}` : "npm not on PATH",
    critical: true,
  });

  // 3. git exists
  const gitVer = runCmd("git --version");
  checks.push({
    label: "git installed",
    ok: !!gitVer,
    detail: gitVer ?? "git not on PATH",
    critical: true,
  });

  // 4. .env.local exists
  let repo: string | null = null;
  try {
    repo = findRepoRoot();
  } catch (err) {
    checks.push({
      label: "Repo root located",
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
      critical: true,
    });
  }
  if (repo) {
    const envFile = path.join(repo, ".env.local");
    checks.push({
      label: ".env.local present",
      ok: fs.existsSync(envFile),
      detail: envFile,
      critical: true,
    });
  }

  // 5. Required env vars
  const env = repo ? readEnvLocal() : {};
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "ANTHROPIC_API_KEY",
  ];
  for (const k of required) {
    const v = env[k] ?? process.env[k] ?? "";
    checks.push({
      label: `env: ${k}`,
      ok: !!v,
      detail: v ? "set" : "missing",
      critical: true,
    });
  }

  // 6. Supabase reachable.
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (supabaseUrl && anonKey) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      });
      checks.push({
        label: "Supabase reachable",
        ok: res.ok || res.status === 404,
        detail: `HTTP ${res.status}`,
        critical: true,
      });
    } catch (err) {
      checks.push({
        label: "Supabase reachable",
        ok: false,
        detail: err instanceof Error ? err.message : String(err),
        critical: true,
      });
    }
  }

  // 7. Anthropic reachable (no-op API call: list models).
  const anthropicKey = env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/models", {
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
      });
      checks.push({
        label: "Anthropic reachable",
        ok: res.ok,
        detail: `HTTP ${res.status}`,
        critical: true,
      });
    } catch (err) {
      checks.push({
        label: "Anthropic reachable",
        ok: false,
        detail: err instanceof Error ? err.message : String(err),
        critical: true,
      });
    }
  }

  // 8. Google integration row (warn-only).
  if (supabaseUrl && (env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    try {
      const { getServiceClient } = await import("../lib/supabase.js");
      const supabase = await getServiceClient();
      const { data, error } = await supabase
        .from("integrations")
        .select("provider")
        .eq("provider", "google")
        .maybeSingle();
      if (error && !/relation .* does not exist/iu.test(error.message)) {
        checks.push({
          label: "Google integration",
          ok: false,
          detail: error.message,
          critical: false,
        });
      } else {
        checks.push({
          label: "Google integration",
          ok: !!data,
          detail: data ? "found" : "missing (run `pectus connect google` if you need GSC/GA4)",
          critical: false,
        });
      }
    } catch (err) {
      checks.push({
        label: "Google integration",
        ok: false,
        detail: err instanceof Error ? err.message : String(err),
        critical: false,
      });
    }
  }

  // 9. at least one brands/<slug>/brand.json exists (or legacy brand/brand.json)
  if (repo) {
    const brandsRoot = path.join(repo, "brands");
    const found: string[] = [];
    if (fs.existsSync(brandsRoot)) {
      for (const ent of fs.readdirSync(brandsRoot, { withFileTypes: true })) {
        if (!ent.isDirectory()) continue;
        const f = path.join(brandsRoot, ent.name, "brand.json");
        if (fs.existsSync(f)) found.push(`brands/${ent.name}/brand.json`);
      }
    }
    const legacy = path.join(repo, "brand", "brand.json");
    if (found.length === 0 && fs.existsSync(legacy)) {
      found.push("brand/brand.json (legacy single-brand layout)");
    }
    checks.push({
      label: "brand profile on disk",
      ok: found.length > 0,
      detail:
        found.length === 0
          ? "missing — run `npx pectus brand`"
          : found.join(", "),
      critical: true,
    });
  }

  // 10. skills/ folder with at least one skill (folder containing SKILL.md)
  if (repo) {
    const skillsDir = path.join(repo, "skills");
    let skillCount = 0;
    if (fs.existsSync(skillsDir)) {
      for (const ent of fs.readdirSync(skillsDir, { withFileTypes: true })) {
        if (ent.isDirectory() && fs.existsSync(path.join(skillsDir, ent.name, "SKILL.md"))) {
          skillCount += 1;
        }
      }
    }
    checks.push({
      label: "skills/ has at least one skill",
      ok: skillCount > 0,
      detail: `${skillCount} skill(s)`,
      critical: true,
    });
  }

  // Render.
  let allCritOk = true;
  for (const c of checks) {
    const icon = c.ok ? kleur.green("OK ") : c.critical ? kleur.red("FAIL") : kleur.yellow("WARN");
    console.log(`${icon}  ${c.label.padEnd(34, " ")} ${kleur.dim(c.detail)}`);
    if (!c.ok && c.critical) allCritOk = false;
  }

  if (!allCritOk) {
    console.log("");
    console.log(kleur.red("Critical checks failed."));
    process.exit(1);
  }
  console.log("");
  console.log(kleur.green("All critical checks passed."));
}
