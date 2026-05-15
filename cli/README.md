# cli — `pectus` command

The command-line tool Claude Code calls during install. Also available for ongoing operations.

## Commands

```
pectus init                         install orchestrator (called from pectus.md)
pectus brand                        interactive brand setup
pectus connect supabase             create project, run migrations, seed admin
pectus connect google               OAuth + service account setup
pectus connect vercel               link project, push env
pectus connect github               set upstream + origin
pectus project create             create a project
pectus project list               list projects
pectus analyze                      run a skill
pectus skills list                  list installed skills + versions
pectus knowledge digest             run knowledge-digest skill
pectus app install <repo-url>       install a community app
pectus app list                     list installed apps
pectus make-it skill                scaffold a new skill (interactive)
pectus make-it app                  scaffold a new app (interactive)
pectus doctor                       health check
pectus update                       pull upstream + run migrations
```

All commands are stubbed in v1. Implementation lands in PR5 alongside the `content-insights` app port.

## Run from the repo

```
npx pectus <command>
```

This uses the project-resolved CLI rather than a globally installed one — keeps the user's CLI version in lockstep with their fork's expected version.

## Updating

`pectus update` fetches `upstream/main`, rebases your install onto it, and runs `npm install`. It auto-stashes any modified tracked files before the rebase and pops them back after, so a dirty working tree no longer blocks an update. If the pop hits real conflicts (you and upstream both edited the same lines), the stash is preserved and the conflicts are surfaced in `git status` for you to resolve.

If `npx pectus update` itself fails to start — typically a Node module-loader error from a pre-v0.2.1 install — bypass the CLI and rebase by hand from the install root:

```
git stash push -m "pre-update"
git fetch upstream main
git rebase upstream/main
npm install
git stash pop
```

That's the same sequence `pectus update` runs internally; doing it by hand bootstraps you to a version where the CLI can update itself.
