// pectus update — pull upstream main, run npm install, surface what changed.

import { execSync, spawn } from "node:child_process";
import kleur from "kleur";
import { findRepoRoot } from "../lib/repo-root.js";

function exec(cmd: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd, stdio: "inherit" });
    p.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} exited ${code}`)),
    );
  });
}

export async function run(): Promise<void> {
  const repo = findRepoRoot();

  // Verify upstream remote exists.
  let hasUpstream = false;
  try {
    const remotes = execSync("git remote", { cwd: repo }).toString();
    hasUpstream = /^upstream$/m.test(remotes);
  } catch {
    /* git missing — caught below */
  }
  if (!hasUpstream) {
    console.error(kleur.red("No `upstream` remote configured."));
    console.log(kleur.dim("Add it with: git remote add upstream https://github.com/pectusai/pectus.git"));
    process.exit(1);
  }

  console.log(kleur.bold("Fetching upstream..."));
  await exec("git", ["fetch", "upstream", "main"], repo);

  // Show what's coming.
  try {
    const log = execSync("git log --oneline HEAD..upstream/main", { cwd: repo }).toString().trim();
    if (!log) {
      console.log(kleur.green("Already up to date."));
      return;
    }
    console.log("");
    console.log(kleur.bold("Incoming changes:"));
    console.log(log);
    console.log("");
  } catch {
    /* fall through to rebase */
  }

  console.log(kleur.bold("Rebasing onto upstream/main..."));
  try {
    await exec("git", ["rebase", "upstream/main"], repo);
  } catch (err) {
    console.error(kleur.red("Rebase hit conflicts."));
    console.error(kleur.dim("Resolve by hand, then run `git rebase --continue`."));
    console.error(kleur.dim("If you edited upstream-managed files, prefer `git checkout upstream/main -- <path>`."));
    process.exit(1);
  }

  console.log(kleur.bold("Running npm install..."));
  await exec("npm", ["install"], repo);

  console.log("");
  console.log(kleur.green("Update complete."));
  console.log(
    kleur.dim(
      "If the migration file changed, run `pectus connect supabase` again to apply new SQL. Otherwise restart `npm run dev`.",
    ),
  );
}
