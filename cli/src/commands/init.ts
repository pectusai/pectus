// pectus init — orchestrates the install steps in pectus.md.

import fs from "node:fs";
import path from "node:path";
import { execSync, spawn } from "node:child_process";
import { intro, outro, note, confirm, isCancel } from "@clack/prompts";
import kleur from "kleur";
import { findRepoRoot } from "../lib/repo-root.js";
import { loadEnv } from "../lib/load-env.js";
import { readEnvLocal } from "../lib/env-file.js";

function checkBin(cmd: string): boolean {
  try {
    execSync(`which ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

async function run(): Promise<void> {
  loadEnv();
  intro(kleur.bold().bgBlue().white(" Pectus install "));

  // 1. Prerequisites.
  for (const cmd of ["node", "npm", "git"]) {
    if (!checkBin(cmd)) {
      console.error(kleur.red(`${cmd} not found. Install it before continuing.`));
      console.error(kleur.dim("On macOS: brew install node git"));
      process.exit(1);
    }
  }
  const node = execSync("node --version").toString().trim();
  console.log(kleur.dim(`node ${node}`));

  const repo = findRepoRoot();
  console.log(kleur.dim(`repo: ${repo}`));

  // 2. npm install if needed.
  if (!fs.existsSync(path.join(repo, "node_modules"))) {
    note("Installing dependencies (this can take a minute).", "Step 1 / 5");
    await new Promise<void>((resolve, reject) => {
      const p = spawn("npm", ["install"], { cwd: repo, stdio: "inherit" });
      p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`npm install exited ${code}`))));
    });
  }

  // 3. Brand setup if needed. v0.4 stores brands at brands/<slug>/brand.json
  // (multi-brand). Older installs keep brand/brand.json (single-brand) which
  // the connect/sync flow auto-migrates.
  const brandsRoot = path.join(repo, "brands");
  const legacyBrandFile = path.join(repo, "brand", "brand.json");
  let needsBrand = true;
  if (fs.existsSync(brandsRoot)) {
    for (const ent of fs.readdirSync(brandsRoot, { withFileTypes: true })) {
      if (!ent.isDirectory()) continue;
      const f = path.join(brandsRoot, ent.name, "brand.json");
      if (!fs.existsSync(f)) continue;
      try {
        const b = JSON.parse(fs.readFileSync(f, "utf8"));
        if (b.name && b.name !== "Your Brand") {
          needsBrand = false;
          break;
        }
      } catch {
        /* try the next dir */
      }
    }
  }
  if (needsBrand && fs.existsSync(legacyBrandFile)) {
    try {
      const b = JSON.parse(fs.readFileSync(legacyBrandFile, "utf8"));
      if (b.name && b.name !== "Your Brand") needsBrand = false;
    } catch {
      /* fall through to brand setup */
    }
  }
  if (needsBrand) {
    note("Brand setup. Pectus uses your brand for everything downstream.", "Step 2 / 5");
    const { run: brand } = await import("./brand.js");
    await brand();
  } else {
    console.log(kleur.dim("Brand already configured — skipping. (Edit at /brand once you're running.)"));
  }

  // 4. Supabase if not connected.
  const env = readEnvLocal();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    note("Supabase setup. You'll need an account and a project.", "Step 3 / 5");
    const { run: connect } = await import("./connect.js");
    await connect("supabase");
  } else {
    console.log(kleur.dim("Supabase env present — skipping connect."));
  }

  // 5. Google integration (optional, but recommended for the dashboard).
  const wantsGoogle = await confirm({
    message: "Connect Google (GSC + GA4) now? You can also do this later.",
    initialValue: true,
  });
  if (!isCancel(wantsGoogle) && wantsGoogle) {
    const { run: connect } = await import("./connect.js");
    await connect("google");
  }

  // 6. Anthropic API key.
  const env2 = readEnvLocal();
  if (!env2.ANTHROPIC_API_KEY) {
    note(
      "Anthropic API key. Generate at https://console.anthropic.com/ and add to .env.local as ANTHROPIC_API_KEY.",
      "Step 4 / 5",
    );
    console.log(kleur.dim("Skipping for now — analyze commands will fail until it's set."));
  }

  outro(
    kleur.green(
      "Install complete. Next: `npm run dev`, then `npx pectus project create`, then `npx pectus analyze --project <code> --skill weekly-analysis`.",
    ),
  );
}

export { run };
