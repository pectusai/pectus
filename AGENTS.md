# Working in a Pectus repo

This file is the rails. You — Claude Code, or any other coding agent — are operating inside a Pectus install. These rules constrain what you do here.

## Repo shape

```
pectus/
├── pectus.md          install script
├── apps/              service connectors (upstream-managed)
├── skills/            growth loops (upstream-managed, SKILL.md folders)
├── knowledge/         user's data lake (user-managed, mostly gitignored)
├── brand/             user's brand profile (user-managed, committed to fork)
├── cms/               Next.js admin app (upstream-managed)
├── hub-template/      Astro public site (upstream-managed)
├── cli/               pectus CLI (upstream-managed)
└── docs/              reference docs
```

**Upstream-managed** = comes from `github.com/pectusai/pectus`. Editing these files locally creates merge conflicts on `pectus update`. Don't.

**User-managed** = the user's own content. Edit freely.

## Install rails

When the user asks you to install Pectus, follow `pectus.md` step by step. Don't reorder, don't skip.

- Always use `npx pectus <cmd>` for service setup. Don't shell out to `supabase`, `vercel`, or `gh` directly unless `pectus connect` doesn't cover that subtask.
- Write env values to `.env.local`, never `.env` (which is checked in as the example).
- Brand setup must complete before `pectus connect supabase` — `brand.json` seeds the initial `brand_profile` row.
- If a step fails, stop and surface the error. Don't silently retry. Don't paper over it.

## Skill execution rails

Skills run through `cms/src/lib/skill-runner.ts`. Never call Claude directly from a CMS route — the runner exists to log every run to the `skill_runs` table for observability.

When a user asks you to "run the weekly analysis," call `npx pectus analyze --workspace <code> --skill weekly-analysis`. Same for any other skill.

## Editing rails

You may freely edit:
- `brand/` (the user's brand profile)
- `knowledge/` (the user's data lake)
- `.env.local` (gitignored)
- `pectus.config.ts` files in `hub-template/` for tokens that aren't covered by the brand
- New files the user explicitly asks for

You should not edit:
- `skills/` — those are upstream-managed. If a skill needs changing, the change goes upstream at `pectus.dev`.
- `apps/` — same reason.
- `cms/src/app/`, `cms/src/lib/` — same.
- `hub-template/src/` — except templated copy in `pectus.config.ts`.
- `cli/src/` — same.

If the user asks you to edit one of these, push back: "That's an upstream change. Want me to help draft a contribution to pectusai/pectus instead?"

## Update protocol

When the user asks to update:

1. Run `npx pectus update`. This wraps `git pull upstream main && npm install && npx pectus migrate`.
2. Read the upstream changelog (`docs/CHANGELOG.md`).
3. Summarize what changed for the user: new skills, new connectors, schema migrations, breaking changes.
4. **If any DB migrations are pending, ask the user before running them.**

## Adding a new skill

Skills aren't authored in the user's fork. They're authored at `github.com/pectusai/pectus` (or contributed via PR from a community member).

If the user wants to write a skill of their own:
- Walk them through cloning `pectusai/pectus` separately, branching, writing the `SKILL.md`, opening a PR.
- Don't write it in their working repo — that fork is for using Pectus, not building it.

Pointer: https://pectus.dev for the skill author guide.

## Adding a new connector (app)

Same rule: connectors are upstream code. Adding `apps/serpapi/` to the user's fork won't survive an update. Direct contributions to `pectusai/pectus`.

## Cross-references

- Architecture overview: `docs/architecture.md`
- SKILL.md contract: `docs/skills-spec.md`
- Upgrading: `docs/upgrading.md`
- FAQ: `docs/faq.md`
