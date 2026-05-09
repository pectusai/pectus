// pectus update — pull upstream main, run npm install, surface what changed.

import { execSync, spawn } from "node:child_process";
import kleur from "kleur";
import { findRepoRoot } from "../lib/repo-root.js";
import { reportV04Migration, runV04DiskMigration } from "../lib/disk-migration.js";

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

  // Auto-stash modified tracked files so the rebase can proceed. Untracked
  // files don't block rebase, so leave them alone.
  const dirty = execSync("git status --porcelain --untracked-files=no", { cwd: repo })
    .toString()
    .trim();
  const stashMessage = `pectus-update auto-stash ${new Date().toISOString()}`;
  let stashed = false;
  if (dirty) {
    console.log(kleur.bold("Stashing local changes so the rebase can proceed..."));
    console.log(kleur.dim(dirty.split("\n").map((l) => "  " + l).join("\n")));
    await exec("git", ["stash", "push", "-m", stashMessage], repo);
    stashed = true;
  }

  console.log(kleur.bold("Rebasing onto upstream/main..."));
  try {
    await exec("git", ["rebase", "upstream/main"], repo);
  } catch (err) {
    console.error(kleur.red("Rebase hit conflicts."));
    console.error(kleur.dim("Resolve by hand, then run `git rebase --continue`."));
    console.error(kleur.dim("If you edited upstream-managed files, prefer `git checkout upstream/main -- <path>`."));
    if (stashed) {
      console.error(
        kleur.yellow(
          `\nYour local changes are saved as a stash with message "${stashMessage}".`,
        ),
      );
      console.error(
        kleur.dim("Once the rebase is resolved, run `git stash pop` to restore them."),
      );
    }
    process.exit(1);
  }

  if (stashed) {
    console.log(kleur.bold("Restoring your local changes..."));
    try {
      await exec("git", ["stash", "pop"], repo);
    } catch {
      console.error(
        kleur.yellow(
          "Your local changes overlapped with files upstream also touched, so the auto-restore hit conflicts.",
        ),
      );
      console.error(
        kleur.dim("Run `git status` to see the conflicted files, resolve them by hand, then `git add <file>` and `git stash drop` when done."),
      );
      console.error(kleur.dim(`Your changes are still preserved as the stash with message "${stashMessage}".`));
      console.error(kleur.dim("Continuing with npm install; you can finish the merge in your own time.\n"));
    }
  }

  console.log(kleur.bold("Running npm install..."));
  await exec("npm", ["install"], repo);

  reportV04Migration(runV04DiskMigration(repo));

  console.log("");
  console.log(kleur.green("Update complete."));
  console.log(
    kleur.dim(
      "Restart `npm run dev` and open the CMS. If schema changes shipped, you'll see an Apply banner at the top — click it.",
    ),
  );
}
