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
pectus workspace create             create a workspace
pectus workspace list               list workspaces
pectus analyze                      run a skill
pectus skills list                  list installed skills + versions
pectus knowledge digest             run knowledge-digest skill
pectus doctor                       health check
pectus update                       pull upstream + run migrations
```

All commands are stubbed in v1. Implementation lands in PR5 alongside the hub-template port.

## Run from the repo

```
npx pectus <command>
```

This uses the workspace-resolved CLI rather than a globally installed one — keeps the user's CLI version in lockstep with their fork's expected version.
