# Upgrading Pectus

Pectus is fork-and-pull. You forked `pectusai/pectus`, you pull from `upstream main` to get updates.

## The command

```
npx pectus update
```

This wraps:

```
git fetch upstream main
git rebase upstream/main          # or merge, depending on your workflow
npm install                       # in case dependencies changed
npx pectus migrate                # apply any pending Supabase migrations
```

After it runs, the CLI summarizes what changed: new skills, new connectors, schema migrations, breaking changes.

## What `pectus update` won't touch

- `brand/` — your brand profile
- `knowledge/raw/`, `knowledge/keywords/`, `knowledge/insights.md` — your data
- `.env.local` — your secrets

These are user-managed. Updates flow into upstream-managed paths only.

## Handling conflicts

If you've edited an upstream-managed file (`apps/`, `skills/`, `cms/src/`, `hub-template/src/`, `cli/src/`), `git rebase` will surface a conflict.

**Don't resolve it by keeping your changes.** That's the path to drifting permanently from upstream and missing every future update.

Instead:

1. Discard your local edits to that file: `git checkout upstream/main -- path/to/file`.
2. If your edits were genuinely valuable, draft them as a PR to `pectusai/pectus` so they land upstream.

If a configuration file (e.g. `pectus.config.ts` in `hub-template/`) conflicts because both you and upstream changed it, hand-merge that one.

## Migrations

`pectus update` runs any new SQL files in `apps/supabase/migrations/` that haven't been applied to your Supabase project.

Migrations are forward-only and idempotent. Re-running a migration that's already been applied is a no-op.

If a migration fails (rare — usually a permissions or extension issue), `pectus update` stops and surfaces the error. Fix the underlying issue and re-run.

## What changed in this version

See `docs/CHANGELOG.md` (added in PR1, populated as releases ship).

## Rolling back

```
git reset --hard <previous-commit>
```

Pectus doesn't ship a CLI rollback because the hard part isn't the code — it's the database. If a migration changed schema in a non-reversible way, rolling back the code without rolling back the DB leaves you in a broken state.

If you need to roll back, do it deliberately: identify the migration, write a manual reverse migration, run it before reverting the code.
