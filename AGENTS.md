# Working in a Pectus repo

This file is the rails. You — Claude Code, or any other coding agent — are operating inside a Pectus install. These rules constrain what you do here.

## Repo shape

```
pectus/
├── pectus.md          install script
├── CHANGELOG.md       release notes
├── connectors/        infrastructure (Supabase, Anthropic, Vercel, GitHub, Google auth)
├── apps/              installable surfaces — data sources and publishers (upstream + community)
├── skills/            verbs — growth loops, analysis, content production (upstream + community)
├── knowledge/         user's data lake (user-managed, mostly gitignored)
├── brand/             user's brand profile (user-managed, committed to fork)
├── cms/               Next.js admin app (upstream-managed)
└── cli/               pectus CLI (upstream-managed)
```

Reference documentation lives at https://pectus.ai/docs (not in this repo).

**Upstream-managed** = comes from `github.com/pectusai/pectus` (`connectors/`, `cms/`, `cli/`, plus the official apps and skills). Editing these locally creates merge conflicts on `pectus update`. Don't.

**Community-installable** = `apps/` and `skills/` can also hold third-party additions installed via `npx pectus app install <repo>` or `npx pectus skill install <repo>`. Those land in `apps/community/` and `skills/community/` respectively.

**User-managed** = the user's own content (`brand/`, `knowledge/`, `.env.local`). Edit freely.

## Install rails

When the user asks you to install Pectus, follow `pectus.md` step by step. Don't reorder, don't skip.

- Always use `npx pectus <cmd>` for service setup. Don't shell out to `supabase`, `vercel`, or `gh` directly unless `pectus connect` doesn't cover that subtask.
- Write env values to `.env.local`, never `.env` (which is checked in as the example).
- Brand setup must complete before `pectus connect supabase` — `brand.json` seeds the initial `brand_profile` row.
- If a step fails, stop and surface the error. Don't silently retry. Don't paper over it.

## Skill execution rails

Skills run through `cms/src/lib/skill-runner.ts`. Never call Claude directly from a CMS route — the runner exists to log every run to the `skill_runs` table for observability.

When a user asks you to "run the weekly analysis," call `npx pectus analyze --project <code> --skill weekly-analysis`. Same for any other skill.

## Editing rails

You may freely edit:
- `brand/` (the user's brand profile)
- `knowledge/` (the user's data lake)
- `.env.local` (gitignored)
- `pectus.config.ts` inside any installed app for tokens that aren't covered by the brand
- New files the user explicitly asks for

You should not edit:
- `skills/` (official ones at the top level) — upstream-managed. Skill changes go upstream at `pectus.dev`. Community skills under `skills/community/` belong to their authors; treat those as upstream too unless the user explicitly forks one.
- `apps/` (official ones at the top level) — same. Community apps under `apps/community/` follow the same rule.
- `connectors/` — infrastructure, always upstream.
- `cms/src/app/`, `cms/src/lib/` — upstream.
- `cli/src/` — upstream.

If the user asks you to edit one of these, push back: "That's an upstream change. Want me to help draft a contribution to pectusai/pectus instead?"

## Update protocol

When the user asks to update:

1. Run `npx pectus update`. This wraps `git pull upstream main && npm install && npx pectus migrate`.
2. Read the upstream changelog (`CHANGELOG.md` at repo root).
3. Summarize what changed for the user: new skills, new connectors, schema migrations, breaking changes.
4. **If any DB migrations are pending, ask the user before running them.**

## Adding a new skill

Skills aren't authored in the user's fork. They're authored at `github.com/pectusai/pectus` (or contributed via PR from a community member).

If the user wants to write a skill of their own:
- Walk them through cloning `pectusai/pectus` separately, branching, writing the `SKILL.md`, opening a PR.
- Don't write it in their working repo — that fork is for using Pectus, not building it.

Pointer: https://pectus.dev for the skill author guide.

## Adding a new app

Apps are installable surfaces (data sources like `ga4`, publishers like `wordpress`). Two paths:

- **Official apps** (curated): contributed via PR to `github.com/pectusai/pectus`, land at the top level of `apps/`.
- **Community apps**: installed by users via `npx pectus app install <repo-url>`, land in `apps/community/<name>/`. Anyone can publish one.

If the user wants to author a new app from scratch, point them at the `make-it` skill, which scaffolds the manifest, schema, and provision skeleton.

### Inbound vs outbound apps

- **Inbound apps** (data sources): `gsc`, `ga4`, `google-ads`, `meta`, `linkedin`, `seed-keywords`. Standard shape: `APP.md` + `schema.ts` + `provision.ts` + `fetch.ts` + `README.md`. Plus an **`insights/` subfolder** containing the interpretation skill that turns this app's data into unified `Insight` rows. The subfolder has `SKILL.md` + `schema.ts` and is invoked by the skill-runner via the path-style name `<app-name>/insights` (e.g. `gsc/insights`).
- **Outbound apps** (publishers): `content-insights`, future `wordpress`, `storyblok`. Different shape — they receive structured content to render, not data to interpret. **No `insights/` subfolder.** The on-disk shape varies per platform (content-insights is a full Astro app; WordPress would be theme files; etc.).
- **Manual-data inbound apps** (`seed-keywords` today, future CSV uploads): minimal version of the inbound shape. No `provision.ts` or `fetch.ts` because the data is user-typed and stored directly by migrations. Just `APP.md` + `insights/` + `README.md`. Reference: `apps/seed-keywords/`.

### The Insight contract

Every inbound app's interpretation skill produces an `InsightBatch` matching `cms/src/lib/types/insight.ts`:

```ts
{
  summary: string,
  insights: Array<{
    type: string,            // controlled vocabulary, defined per app
    title: string,
    opportunity: string,
    evidence: object,        // app-specific, typed via discriminated union per type
    confidence: 'low' | 'medium' | 'high',
    topic_hint: string | null,  // bridges to plan-sitemap when this insight suggests a topic
    related_keywords: string[],
    related_urls: string[],
    expires_at: string | null,
  }>
}
```

The skill-runner auto-persists this output to the `insights` table when the skill name ends in `/insights`. Replace-on-rerun strategy: the table is wiped for that (project, app) pair before fresh rows are inserted. History lives in `skill_runs.output`.

Consumer skills (`weekly-analysis`, `plan-sitemap`, future) call `runInterpretationsIfStale(projectId)` from `cms/src/lib/skill-runner` BEFORE their own gather phase. Stale insights are detected per app by comparing the latest `insights.created_at` to the app's `last_fetched_at` in `project_data_freshness`. Stale interpretations run in parallel.

Reference example: `apps/seed-keywords/insights/` (the minimal-inbound case).

## Adding a new connector

Connectors are infrastructure (Supabase, Vercel, etc). Always upstream code. Adding `connectors/serpapi/` to the user's fork won't survive an update. Contributions go to `pectusai/pectus`.

## Cross-references

- Architecture overview: https://pectus.ai/docs/architecture
- SKILL.md contract: https://pectus.ai/docs/skills-spec
- Upgrading: https://pectus.ai/docs/upgrading
- FAQ: https://pectus.ai/docs/faq
