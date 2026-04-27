# Pectus architecture

How the pieces fit. Read this first if you're contributing upstream or trying to understand the codebase.

## Mental model

Pectus is a self-hosted application split into five layers:

```
        ┌──────────────────────────────────┐
        │   cms/         hub-template/     │   surfaces (what the user sees)
        ├──────────────────────────────────┤
        │   skills/                        │   logic (what processes data into insight)
        ├──────────────────────────────────┤
        │   apps/                          │   I/O (how data flows in and out)
        ├──────────────────────────────────┤
        │   knowledge/    brand/           │   user data
        ├──────────────────────────────────┤
        │   cli/                           │   the operator's seat
        └──────────────────────────────────┘
```

Each layer depends only on the layers below it. The CMS imports from skills, apps, knowledge, brand. Skills import from apps. Apps don't import from skills. Knowledge and brand don't import from anything.

## Data flow

A weekly analysis run, from button-press to dashboard update:

1. User clicks "Run weekly analysis" in the CMS dashboard.
2. The dashboard route calls `cms/src/lib/skill-runner.ts` with `skill: "weekly-analysis", workspace_id: ...`.
3. Skill runner loads `skills/weekly-analysis/SKILL.md`, parses frontmatter, reads `schema.ts`.
4. Skill runner gathers inputs by reading from Supabase via `apps/supabase/client.ts`:
   - top 200 keywords
   - last 500 articles
   - icp_profiles row
   - brand_profile row
   - knowledge_insights (read from `knowledge/insights.md`)
   - last week's analysis (if any)
5. Skill runner calls `apps/anthropic/client.ts` with the SKILL.md body as system prompt, the inputs as user message, and the schema for structured output. Cache markers go on brand_profile, icp_profile, knowledge_insights.
6. Claude returns structured JSON. Runner parses it through the Zod schema.
7. Runner writes a row to `skill_runs` (input digest, output, status, duration). Also upserts to `weekly_analyses` for backwards compatibility with the dashboard read path.
8. Dashboard re-renders with the new analysis.

## Why two-layer brand storage

`brand/brand.json` (file) + `brand_profile` (Supabase row) sounds redundant. It's not.

- The file makes brand portable across Supabase resets and lets the Astro hub-template read brand at build time without DB access.
- The DB row makes runtime queries fast and lets the CMS edit brand from the browser without touching the filesystem.

The CMS keeps them in sync: file is the source of truth, DB is the cache.

## Why skills aren't in the CMS

Skills are upstream code. If a user could author skills inside their own fork, every install would diverge. By keeping skills in `skills/` (upstream-managed) and exposing only the runner in the CMS, every Pectus install runs the same skills with the same contracts.

When a community contributor adds a skill upstream, every existing user gets it on the next `pectus update`. That's the upgrade channel.

## Why apps are flat folders

Connectors don't share much code with each other. A SerpAPI connector has nothing to do with a Vercel connector. So they're isolated folders, each with the same shape (README, client, optional provision, domain methods). Adding a new one is a single-folder PR.

## How the hub-template is meant to be used

In v1, locally only — `npm run dev` for preview. The user sees what their public site would look like with their brand applied. They don't deploy from Pectus in v1; if they want a public site they ship it themselves.

In v2, deploy comes back. The hub-template will pull articles from the user's Supabase via `sync-articles`, build static, and ship to Vercel via `pectus connect vercel`.

## Database schema overview

See `apps/supabase/migrations/0001_initial.sql` for the canonical schema. v1 tables:

- **Users + access**: `profiles`, `review_policy`
- **Workspaces**: `workspaces`, `workspace_data_freshness`
- **Brand**: `brand_profile`
- **Audience**: `icp_profiles`, `answer_public_entries`
- **Content**: `articles`, `keywords`
- **Sources**: `content_sources`, `content_source_pages`
- **Integrations**: `integrations`
- **Analysis**: `weekly_analyses`, `skill_runs`
- **Reserved (out of v1 surface)**: `competitors`, `sales_pdfs`

## Where things diverge from content-hub-cms

If you're coming from the Teamtailor content-hub-cms codebase, the deltas are:

- All generator routes removed. Article create/edit write paths gone.
- Image generation pipeline parked in `docs/legacy/` for v2.
- Sales tool removed from CMS surface; tables kept.
- Dashboard's inline Claude call refactored to call the `weekly-analysis` skill via `skill-runner.ts`.
- New `skill_runs` table for unified run logging.
- New `review_policy` table for compliance gate.
- Brand schema gains font fields (heading + body, source = system/google/uploaded).
- Google OAuth domain restriction (`hd=teamtailor.com`) removed.
- Astro hub-template restyled for a neutral light-mode default; Teamtailor pink/cream/dark removed.
