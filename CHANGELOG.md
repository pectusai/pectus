# Changelog

## v0.3.5 — pectus.ai polish, identifier scrub

- pectus.md install step 11 wording matches the actual `/apps/content-hub` UI ("Click the content-hub card → fill the settings form → Save and activate Content Hub").
- Scrubbed maintainer-specific identifiers (`jesperastrom` → `acme-corp` / `your-brand`) from all user-facing examples.
- Brand save no longer fails on partial unique index.
- pectus.ai docs reorg: three top-level setup walkthroughs (`/docs/setup-anthropic-account`, `/docs/setup-supabase-account`, `/docs/setup-service-account`); install.md first in "Start here" followed by the three setups; Concepts moved to "Using Pectus".

## v0.3.4 — Workspace sidebar nav

- New left sidebar in workspace routes lists Dashboard + per-active-app groups (Content Hub when activated, with Pages / Articles / Site URL / Redirects) + Settings.
- Bare `/workspaces/<code>` redirects to `/dashboard`.

## v0.3.3 — Inline errors + Google API guidance

- Skill / app run errors render inline with actionable next steps.
- GA4 / GSC error paths surface Google-API-specific guidance instead of generic stack traces.

## v0.3.2 — GA4/GSC visual polish, JSON upload

- Per-app settings pages get visual polish.
- JSON file upload for the Google service-account credential (the long path through env vars stays available).

## v0.3.1 — Per-app settings UI

- Real per-app settings UI under `/apps/<name>` (Test connection, config form, status badge).
- Detect missing migration `0006_activated_apps.sql` and surface an inline SQL banner pointing the user at `connectors/supabase/migrations/0006_activated_apps.sql` to run by hand.

## v0.3.0 — Apps as plugins (Phase 1)

The CMS becomes a shell. Apps register their own surfaces. Phase 1 ships
the activation model with content-hub as the first plugin.

- New top-nav entry `Apps` (CMS at `/apps`). Lists every app under
  `apps/*` with status (Activated / Available), type (inbound /
  outbound), and version. Tooltips on every badge.
- New tables `activated_apps` (install-level) and `workspace_app_config`
  (per-workspace), in migration `0006_activated_apps.sql`. Backfill
  auto-activates content-hub for any v0.2 install where a workspace has
  `mount_slug` or `content_hub_repo` set, so upgrading does not hide
  Articles or Pages surfaces.
- Workspace tabs Pages and Articles, plus Settings → Site URL and
  Redirects, are now gated on content-hub activation. Inactive surfaces
  render an `ActivateAppPointer` linking to `/apps`.
- New per-workspace activation wizard at
  `/apps/content-hub/activate`. Captures site shape (Brand new vs
  Existing site), mount slug, and GitHub repo. Replaces the
  corresponding prompts in `npx pectus workspace create`.
- `npx pectus workspace create` now collects only identity (name, code,
  locale) and seed keywords. Site shape and repo move into the
  activation wizard.
- Workspace dashboard checklist makes Activate Content Hub the second
  item (after Brand). Articles import only renders once content-hub is
  active.
- Install runbook (`pectus.md`) reorganized: step 10 collects only
  workspace identity; new step 11 walks Content Hub activation in the
  CMS Apps tab.
- `apps/content-hub/APP.md` added, declaring the `cms_surfaces` it
  contributes. Phase 1 reads only the basic frontmatter; Phase 2
  generalizes the manifest format.

Backwards compat: existing v0.2 installs upgrading via
`npx pectus update` get content-hub auto-activated and the prior
mount_slug / repo / branch values written into
`workspace_app_config`. Net effect: nothing disappears.

## v0.1.0 — Initial scaffold (PR1)

- Repo skeleton: `connectors/`, `apps/`, `skills/`, `knowledge/`, `brand/`, `cms/`, `cli/`.
- Root files: `pectus.md`, `AGENTS.md`, `README.md`, `CHANGELOG.md`, `.env.example`, `.gitignore`, `package.json`.
- Five seed skills with `SKILL.md` and stub schemas: `weekly-analysis`, `seo-strategy`, `jobs-to-be-done`, `internal-linking`, `knowledge-digest`.
- Connector READMEs and stubs for Supabase, Google, Anthropic, Vercel, GitHub (under `connectors/`).
- Pre-installed `content-hub` app at `apps/content-hub/` (was the standalone `hub-template/`).
- CLI command stubs.
- Reference documentation hosted at https://pectus.ai/docs (architecture, skills spec, upgrading, FAQ, integrations).

No runnable code yet. PR2 onward lands the actual ports.

## v0.1.1 — Apps and connectors split

- Renamed `apps/` to `connectors/` for infrastructure (Supabase, Google auth, Anthropic, Vercel, GitHub).
- Moved `hub-template/` into `apps/content-hub/` as the first installable app, pre-shipped so a new install gets a visual surface immediately.
- New apps model: `apps/` holds installable surfaces (data sources, publishers). Anyone can author one with the `make-it` skill.
- Added `skills/make-it/` — meta-skill that scaffolds new skills and apps from a brief. Emits a `ScaffoldSpec` the CLI consumes to write files. Validates that app prompt bodies don't set tone, voice, colors, or copy (those belong to the core).
- CLI surface expanded: `pectus app install`, `pectus app list`, `pectus make-it skill`, `pectus make-it app` (stubs in v1, implementation in PR6).
- Workspace patterns updated in `package.json`. CMS path aliases in `cms/tsconfig.json` updated to point at `connectors/`.

## v0.1.2 — Inbound apps scaffolded

- Added inbound apps: `apps/gsc/`, `apps/ga4/`, `apps/google-ads/`, `apps/meta/`, `apps/linkedin/`. Each ships APP.md (manifest + prompt body), schema.ts (Zod for fetched rows), provision.ts (CLI setup stub), fetch.ts (API call stub), README.md.
- `apps/gsc/` wraps the existing API client in `connectors/google/gsc.ts` so Search Console data flows through the apps model like every other data source. Outputs aggregated rows to the existing `keywords` table and daily rows to a new `gsc_daily` time-series table.
- Inbound apps land their data in three tables: `keywords` + `gsc_daily` (GSC), `analytics_metrics` (GA4), `ad_metrics` (Google Ads + Meta + LinkedIn, discriminated by `channel`). Migrations for the new tables land in PR6.
- Conceptual docs added at https://pectus.ai/docs: `concepts.md` (the parts of Pectus and how they fit), `apps-spec.md` (the APP.md contract). `architecture.md` rewritten to reflect the new layered model. `skills-spec.md` updated to point at `make-it` as the authoring path.

## v0.2.0 — Content Hub as website builder (in progress)

Foundations + most of the new surface. Publish pipeline (PR13) and install
flow updates (PR14-16) still to land.

**Foundation fixes (preconditions for v0.2):**

- Skill runner status enum aligned with the migration (`completed` / `failed`,
  not `ok` / `error`). Fixed `generated_by` column reference. Removed queries
  for non-existent `articles.body_markdown` (derive from `blocks` instead) and
  non-existent `knowledge_insights` table (read from `knowledge/insights.md`
  file instead, matching the existing CLAUDE.md design).
- Skill runner gained **structured output mode** via Anthropic tool-forcing.
  Skills with `schema: ./schema.ts` in frontmatter return validated typed
  output; the `cms/src/lib/skill-schemas.ts` registry maps skill name to the
  Zod schema. New `args` parameter on `runSkill()` lets callers inject
  per-invocation arguments (e.g. `{ mode, topic_id }`).
- GitHub connector replaced from a stub with a real Octokit-based client.
  `getFile`, `checkRepo`, `commitChanges` (multi-file atomic commit via Git
  Database API), plus convenience wrappers `commitPagePublish` /
  `commitPageUnpublish` for the publish pipeline.

**Data model (PR7):**

- New migration `0002_v0_2_pages.sql` adds: `topics`, `site_plan_nodes` (with
  materialized_path + auto-maintenance trigger + 3-level depth cap),
  `redirects`, `pages`, `page_variants`, `page_drafts`, `seed_keywords`.
- Workspaces gain `mode` (seed/live), `default_locale`, `enabled_locales`,
  `default_locale_skips_prefix`, `mount_slug`, `content_hub_repo`,
  `content_hub_branch`. Existing rows backfill from the legacy `locale` field.
- TypeScript types in `cms/src/lib/types/pages.ts` mirror the schema. Pure
  helpers `buildTree` and `annotateWithPages` live with the types.

**Skills (PR9, PR12 schema):**

- `skills/plan-sitemap/` — turns one topic into a pillar subtree, or all
  topics into a full site plan. Two modes via `args.mode`. Output is a flat
  array of nodes referencing each other by `local_id`; the consumer resolves
  to UUIDs and writes `site_plan_nodes` rows.
- `skills/edit-page/` — applies a user instruction to a page's blocks array
  and returns the new array plus a one-line `summary_of_change`. Surgical,
  not full regeneration.

**CMS — Pages surface (PR8 + PR9):**

- New `Pages` entry in workspace nav.
- New route `/workspaces/[code]/pages` renders the indented site-plan tree
  with status / template / intent badges, child counts, locale chips.
- Plan actions: "Plan a pillar" (topic chooser dropdown) and "Plan full
  site" buttons invoke `plan-sitemap` and persist suggested nodes.
- Suggested nodes render with ✓ Adopt and ✕ Dismiss inline.
- Mobile auto-collapses children at depth 2+.

**CMS — Create Page flow (PR11):**

- Click a planned tree node → `/workspaces/[code]/pages/new?nodeId=X`.
- Two-step picker: Purpose (six options) + Template (cards, with the
  plan's suggestion highlighted).
- Submit creates `pages` + `page_variants` rows with blocks initialised from
  the template's `default_blocks`, marks linked topic as `planned`, redirects
  to the builder.

**CMS — Builder (PR12 partial):**

- New route `/workspaces/[code]/pages/builder/[variantId]`.
- Chat sidebar wired to the `edit-page` skill via the `applyEdit` server
  action. Each turn calls Claude, validates structured output, persists to
  both `page_variants.blocks` and `page_drafts`.
- Iframe preview not yet wired (next session). Right pane currently shows
  the raw block JSON for debugging.

**Templates + shared block library (PR10):**

- New `apps/content-hub/templates/pages/` with seven templates: home,
  pillar, content, landing, listing, contact, about. Each is a folder with
  `manifest.json` + `Render.astro` + `thumbnail.png` placeholder.
- New `apps/content-hub/src/components/blocks/` with eight brand-aware
  Astro block components: Hero, Prose (markdown via `marked`), FeatureGrid,
  Testimonial, Cta, ImageBlock, LinkList, Faq.
- `PageBlockRenderer.astro` dispatches by block type. Block components
  consume brand tokens via CSS variables only — never hardcode colors,
  fonts, or spacing.
- Templates registry at `apps/content-hub/templates/index.ts`, exposed to
  the CMS via the `@pectus/content-hub/templates` path alias for the
  template chooser.

**Insights architecture (PR16, redesigned via grill-me 2026-05-01):**

The original "greenfield seed mode" (binary mode toggle that swapped weekly-analysis input source) was replaced with a unified Insights model. Eight grilled decisions; full design in `pectusai-private/v0.2-content-hub-plan.md` "Insights architecture" section.

- New migration `0003_v0_2_insights.sql` adds the `insights` table.
- Migration `0002` updated to NOT add `workspace.mode` (no longer needed).
- Inbound apps gain an `insights/` subdirectory contract: `apps/<inbound>/insights/SKILL.md` + `insights/schema.ts`. Outbound apps unchanged.
- Skill-runner gains:
  - `resolveSkillDir()` so names like `seed-keywords/insights` resolve to `apps/seed-keywords/insights/SKILL.md`.
  - New `insights` input type that gathers active rows from the insights table grouped by source.
  - `runInterpretationsIfStale()` helper that checks each connected app's last-fetched-at vs its latest insight and re-interprets in parallel where stale.
  - Auto-persistence: when a skill name ends in `/insights`, the runner validates output against `InsightBatch` and writes rows to the insights table (replace-on-rerun strategy).
- New base `Insight` Zod schema in `cms/src/lib/types/insight.ts` — every app's interpretation output extends this shape.
- New app `apps/seed-keywords/` — minimal inbound app (no fetch.ts, no provision.ts, just APP.md + insights/). Interpretation produces `topic_candidate`, `intent_gap`, `audience_alignment`, `weak_signal` insight types.
- `weekly-analysis` SKILL.md updated: frontmatter declares `insights` as a primary input alongside existing raw inputs (transitional). Prompt body instructs Claude to treat insights as primary signal, raw data as supplementary.
- Pages actions (`planPillar`, `planFullSite`) call `runInterpretationsIfStale` before invoking plan-sitemap so the skill reads fresh insights.

**Known issues:**

- `npx pectus update` cannot bootstrap itself when the local CLI is broken. If `cli/package.json` is missing the `"type": "module"` field (which earlier v0.2 installs shipped without), Node refuses to load `cli/bin/pectus.js` and the updater never runs. Adding the field locally then blocks the rebase because `cli/package.json` differs from upstream — chicken and egg. **Workaround until the next release:** stash your local edits and run the rebase by hand from the install root: `git stash push -m "pre-update" && git fetch upstream main && git rebase upstream/main && npm install && git stash pop`. The fix in `cli/src/commands/update.ts` adds an auto-stash/pop around the rebase, so once you're past this version the updater handles dirty trees on its own.

**What's still open in v0.2:**

- PR12 finish: Astro `_preview/[draftId]` route in content-hub. Hybrid output config. Iframe in builder.
- PR13: full publish pipeline (commit-on-publish via the new GitHub connector). Convenience wrappers exist; need to wire a Publish button in the builder.
- PR14: install flow updates for greenfield vs coexist (mount slug prompt). Workspace Settings → Site URL admin section.
- PR15: locale variant management UI in the builder (locale switcher, per-variant slug, status chips on tree).
- PR16 finish: workspace settings UI for managing seed keywords (add/remove). Workspace creation flow gains the seed-keyword prompt for greenfield. "Refresh insights" button with cost-warning modal.

**Deferred to v0.3+ (insights architecture):**

- `apps/gsc/insights/`, `apps/ga4/insights/`, `apps/google-ads/insights/`, `apps/meta/insights/`, `apps/linkedin/insights/` — interpretation skills for each connected data source.
- `apps/answer-public/insights/` — wrap the existing AnswerThePublic raw input.
- As each new insights skill lands, the corresponding raw gatherer in `weekly-analysis` retires.

## What's next (older v0.1 punch list, kept for context)

- **PR2**: port `connectors/supabase/`, `connectors/google/`, `connectors/anthropic/` from content-hub-cms.
- **PR3**: port the CMS (workspaces shell, brand, ICP, keywords, performance, admin, reviews). Generator routes stripped.
- **PR4**: implement the five skills with full prompts and Zod schemas. Add `write-post` and `make-it` skills.
- **PR5**: port the Astro `content-hub` app with neutral default styling. Implement the CLI commands. End-to-end install test.
- **PR6**: ship inbound apps (`ga4`, `google-ads`, `meta`, `linkedin`) and outbound apps (`wordpress`, `storyblok`).
