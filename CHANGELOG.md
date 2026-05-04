# Changelog

## v0.4.2 — Connector framing + IA refactor

**Wipe-and-reinstall required.** v0.4.2 squashes every previous migration (`0001`–`0008`) into a single `0001_pectus_v04.sql`, renames `workspaces` → `projects` everywhere (DB, routes, CLI), and re-keys app activation per-project. There is no automatic upgrade path. To move from v0.4.1: drop / reset your Supabase project, re-clone or re-`npx pectus init`, paste the squashed migration via `/settings/updates`, then re-run install.

Pectus is now framed as a **connector framework with a UI**, not a CMS. Content-hub is one app among peers (alongside GSC, GA4, seed-keywords). Every interactive surface follows three gating principles: must-create-without-integrations, honest-disabled, article-authoring-never-gated.

- **Schema (`0001_pectus_v04.sql`):** single squashed baseline. `workspaces` → `projects` (FK columns, indexes, RLS). `workspace_app_config` → `app_config(project_id, app_name, config)`. `activated_apps` is now keyed on `(project_id, app_name)` — apps activate per-project. `unaccent` extension + `_slugify` defined up front. `integrations` stays brand-scoped. Idempotent, paste-twice-safe.
- **`workspace` → `project` rename:** mechanical refactor across CMS, CLI, install agent (`pectus.md`), every app's APP.md, and every skill's SKILL.md. `pectus workspace add` keeps working as an alias for `pectus project add` for one release.
- **Smart surfaces collapse into apps:** `pages`, `articles`, `sources`, `reviews`, `plan`, `gap`, `settings/site-url`, `settings/redirects`, `settings/review-policy` all moved under `apps/content-hub/`. `settings/seed-keywords` moved under `apps/seed-keywords/settings`. `performance` moved under `apps/ga4/`. The project shell hosts only ICP, Keywords, Apps, and Settings now.
- **Apps page is project-level:** `/brands/<slug>/projects/<code>/apps` lists installed apps with per-row Activate / Deactivate. Brand-level apps tree retired. Per-project sidebar derives groups from each activated app's manifest in `cms/src/lib/apps.ts:APP_SIDEBAR_MANIFESTS`.
- **Settings panel:** `/admin` and `/system/updates` retired. New `/settings` hub: `/settings/account`, `/settings/users`, `/settings/updates`, plus brand-scoped `/brands/<slug>/settings` and `/brands/<slug>/settings/integrations/google`. NavBar shows **Settings** instead of Admin / Updates.
- **Gating with `<NeedsCard>`:** site plan, gap analysis, GA4 performance, GSC keyword sync, and Publish all gate honestly via `cms/src/lib/prereqs.ts`. Missing prerequisites render an inline CTA card with deep-links to the fix. Article authoring, page authoring, ICP, brand profile, project settings, and apps activation are explicitly never-gated.
- **Add-brand modal on `/brands`:** `Add brand` button next to the brand list. Validates slug pattern + uniqueness, inserts the row, materializes `brands/<slug>/brand.json` on disk, redirects to the new brand's profile.
- **Keyword importer polish:** styled `Choose file` button, paste-rows textarea, file picker accepts `.csv` / `.tsv` / `.xls` / `.xlsx` (xlsx wired via `xlsx`). Inline error states for missing keyword column.
- **Seed-keywords diagnostics:** the runner used to silently drop insights when a structured-output schema parse failed. Now logs the parse error and the offending output. Also surfaces zero-insight runs and Supabase insert errors. The actual prompt or schema bug — if any — should be visible next time the skill runs.
- **Bland project home:** `/brands/<slug>/projects/<code>/` is now an apps overview (one line per activated app + a Browse apps link). Killer first-impression deferred to v0.4.3.
- **Legacy redirects:** `/brands/<slug>/workspaces/<code>/...` URLs 301 to the new `/projects/<code>/...` shape for one release cycle.

### Migration steps for v0.4.1 → v0.4.2

1. Drop or reset your Supabase project (Pectus has no in-place schema migration for this jump).
2. `rm -rf` your local install and re-clone or `npx pectus init` from scratch.
3. Walk through `pectus.md` to rebuild brand + first project.
4. Apply `0001_pectus_v04.sql` via `/settings/updates`.
5. On the project's Apps page, activate `content-hub` (or whatever apps you need). Each app's surfaces appear in the sidebar.

### Known v0.4.3 follow-ups

- Killer first-impression home (brand description → AI-generated draft homepage).
- `schema_version` table + auto-detection of pending migrations.
- Per-brand app catalog visibility.
- Cross-app keywords aggregation on the project keywords page.
- Live GA4 performance dashboard.

## v0.4.1 — Slug fix + CMS-driven updates

The v0.4.0 alpha shipped with two slugify implementations that disagreed on Unicode. The CLI used NFKD + combining-mark stripping (so "Aström" became "astrom"), but the SQL `_slugify` had no diacritic handling (so "Aström" became "astr-m"). The disk dir was written under one slug and the DB row under another, breaking every `/brands/<slug>/...` route on installs with non-ASCII brand names.

This release fixes the slugify mismatch and ships the first cut of a CMS-driven update flow so future schema migrations don't need a manual SQL paste.

- **Migration 0008 (`0008_slug_unaccent.sql`):** rewrites `public._slugify` to use the `unaccent` Postgres extension before character stripping. Re-slugifies every existing brand row whose stored slug differs from the canonical form. Idempotent.
- **`/system/updates` page:** lists every migration in `connectors/supabase/migrations/`. Click **Apply** to run a migration against your Supabase project via the Management API. Pectus reads `SUPABASE_ACCESS_TOKEN` from `.env.local` (added in v0.3.9) to authenticate. View-SQL toggle on each migration so you can read what's about to run.
- **`runManagementSql` helper:** wraps `POST https://api.supabase.com/v1/projects/<ref>/database/query` with project-ref derivation from `NEXT_PUBLIC_SUPABASE_URL` and access-token reading. Surfaces 4xx/5xx response bodies inline.
- **NavBar entry:** new "Updates" link visible to every authenticated user. Sits between brand-prefixed links and the admin link.

### Known v0.4.2 follow-ups

- `schema_version` table + auto-detection of pending migrations (today the user picks).
- Banner / badge in the NavBar when pending migrations exist.
- Auto-apply non-destructive migrations on first CMS load.
- Migrate the install agent (`pectus.md` step 6) onto the same Management-API path so first-time installs and ongoing upgrades use the same code.

## v0.4.0 — Multi-brand alpha

Pectus now hosts multiple brands inside a single install. Every brand gets its own row, its own disk directory, its own slug-prefixed URL space, and its own scoped DB rows. Switching brands is a one-click action in the top nav. The intended persona for this is small agencies running several client brands from one Pectus, but it works the same for solo operators who want to keep their personal site, side project, and client work out of each other's way.

This is an alpha. The migration is destructive on schema (it renames `brand_profile` → `brands`, drops the singleton constraint, and re-scopes uniqueness on `projects.code` and `integrations.provider` per-brand), so re-run on a fresh project or take a backup first. After upgrade: run `npx pectus update` (which executes the disk migration), then paste the freshly generated SQL bundle from `pectus.md` step 6 into Supabase's SQL editor.

- **Schema (`0007_v0_4_multi_brand.sql`):** rename `brand_profile` → `brands`, drop singleton, add `slug` (NOT NULL UNIQUE) + `created_at`. Add `brand_id` FK with `ON DELETE CASCADE` on 19 child tables (projects, integrations, app_config, articles, icp_profiles, keywords, content_sources, answer_public_entries, project_data_freshness, weekly_analyses, skill_runs, review_policy, review_queue_items, topics, site_plan_nodes, redirects, pages, seed_keywords, insights). Backfill, then NOT NULL + index. Re-scope `projects.code` and `integrations.provider` uniqueness per-brand. Idempotent and safe to re-run.
- **Disk migration (`cli/src/lib/disk-migration.ts`):** moves `brand/` → `brands/<slug>/` and `knowledge/` → `brands/<slug>/knowledge/`. Wired into `pectus update` and `pectus connect supabase`.
- **Brand-prefixed routes:** `(app)/{brand,apps,reviews,performance,projects}` physically moved under `(app)/brands/[slug]/`. New `/brands` index page lists every brand. `/brands/<slug>` is the project list (brand-scoped via `brand_id`). `/brands/<slug>/profile` is the brand profile editor (was `/brand`). `/brands/<slug>/settings` is a new rename-and-delete page (type-to-confirm delete cascades through 19 child tables and removes the disk directory).
- **Brand resolver (`cms/src/lib/active-brand.ts`):** `getBrandBySlug`, `listBrands`, `readLastBrandSlug`, `writeLastBrandSlug`, `LAST_BRAND_COOKIE = "pectus.lastBrand"`. The `[slug]` layout writes the cookie on every visit; root `page.tsx` redirects to `/brands/<lastUsedSlug>` when set, else `/brands/<onlyBrand>` if there's exactly one, else `/brands`.
- **BrandSwitcher (top nav):** select element in NavBar, cascade-fallback server action that walks the URL, swaps the slug, and lands on the deepest path that resolves under the new brand. For `/brands/<X>/projects/<code>/...` it DB-checks the project code; for stable tops (profile, apps, reviews, performance, settings) it preserves; otherwise falls back to `/brands/<targetSlug>`.
- **Middleware redirects:** every legacy path (`/brand`, `/apps`, `/reviews`, `/performance`, `/projects/...`) resolves to the brand-prefixed equivalent based on the `pectus.lastBrand` cookie. Old bookmarks and any internal `<Link>` or `revalidatePath` call that still references a flat path keeps working at runtime.
- **Skill runner brand-aware:** project lookup includes `brand_id`; brand row resolved once per run; `gatherKnowledgeInsights(brandSlug)` reads from `brands/<slug>/knowledge/insights.md`. The `KNOWLEDGE_ROOT` constant is gone.
- **CLI:** `npx pectus brand add` is now slug-parameterized (writes `brands/<slug>/brand.json`, prompts to confirm the derived slug). `npx pectus connect supabase` walks `brands/<slug>/` directories and upserts each row into the `brands` table.
- **CLI install side-fixes** (rode along with the brand-sync rewrite): `pectus connect supabase` now silently reuses any saved value in `.env.local` (access token, anon key, service-role key) instead of re-prompting on every re-run. If `auth.admin.createUser` fails because the email already exists, the CLI falls back to `listUsers` + `updateUserById` so re-running against an already-bootstrapped project no longer bails.
- **Install agent idempotency (`pectus.md` step 5):** before asking for any service credential, the agent reads `.env.local` and skips every variable already set to a non-empty value. It prints one line per found variable (masking secret-shaped values to the first 4 + last 4 characters) so the user knows what was kept. Replaces the previous behavior of re-asking for everything every install.

### Known v0.4.1 follow-ups

- CMS Add-brand modal (CLI works via `npx pectus brand add` today).
- Export/import bundles (zip a brand's disk dir + DB rows, strip credentials).
- `getProjectByCode(code)` doesn't yet filter by `brand_id`. Manifests only when two brands share a project code.
- Server actions still call `revalidatePath("/projects/<code>/...")` instead of the brand-prefixed equivalent. Middleware redirects keep the user-facing flow working but Next.js cache keys are slightly off.
- Agency persona spec doc (`pectus.ai/docs/multi-brand-as-cms-intermediary.md`).

## v0.3.9 — Collect Supabase access token at install

- Install agent (`pectus.md` step 5) now asks the user to generate a Supabase access token at https://supabase.com/dashboard/account/tokens and paste it back. Saved to `.env.local` as `SUPABASE_ACCESS_TOKEN`. Pectus needs this token to apply schema migrations and other Management-API operations on the user's behalf; previously the install flow declared "Pectus never asks for the access token" and the env var was silently missing, so any command path that needed it bailed.
- `.env.example` documents `SUPABASE_ACCESS_TOKEN` with the token-page URL.

## v0.3.8 — Fix stale `/brand` credential pointers

- GSC sync error messages now point users to `/apps/gsc` instead of `/brand` for Google service account and Search Console site URL configuration. Credentials moved out of the brand page in earlier work; the error strings were left behind.
- `GscSyncButton` UI hint updated for the same reason.
- Google OAuth init and callback routes redirect to `/apps/ga4` on success/error instead of `/brand`. The OAuth flow itself is currently dead code (no UI button initiates it; service-account JSON upload is the only live path), but the redirect targets were inconsistent with the post-refactor app layout.

## v0.3.7 — Audit follow-up (auth, prompt caching, sidebar polish)

- Server actions in `cms/src/app/(app)/apps/[name]/actions.ts` now call `requireUser()` before mutating state. Previously RLS was the only line of defence; the middleware only refreshes Supabase cookies.
- `saveContentHubConfig` switched from `.single()` to `.maybeSingle()` with a fallback redirect to `/apps/content-hub` so a missing project row no longer lands on `/projects/undefined`.
- Skill runner uses Anthropic prompt caching for stable input layers (BRAND, ICP, KNOWLEDGE INSIGHTS) and the system prompt. Successive runs in a 5-minute window read cached input tokens for the static layers instead of re-paying. Applies to both the structured (tool_use) and text-mode call paths.
- Sidebar groups no longer flash open on first paint when the user previously closed them. The wrapper hides itself until the localStorage read finishes, then renders in its final state.
- Tooltips added to sidebar group labels (Content Hub, Settings), the project header `code · locale` line, the Content Hub activate radios (Brand new site / Existing site), and the Mount slug + GitHub repo fields.
- New shared `cms/src/app/components/InfoDot.tsx` lifted from `BrandForm.tsx`. All "?" affordances now reach for the same component.
- Two new install FAQ entries on pectus.ai: `ga4-service-account-not-recognized.md` (propagation delay workaround via the GA4 Admin API + Search Console domain property) and `google-service-account-key-download.md` (where to find the JSON key in Cloud Console, what fields to expect).

## v0.3.5 — pectus.ai polish, identifier scrub

- pectus.md install step 11 wording matches the actual `/apps/content-hub` UI ("Click the content-hub card → fill the settings form → Save and activate Content Hub").
- Scrubbed maintainer-specific identifiers (`jesperastrom` → `acme-corp` / `your-brand`) from all user-facing examples.
- Brand save no longer fails on partial unique index.
- pectus.ai docs reorg: three top-level setup walkthroughs (`/docs/setup-anthropic-account`, `/docs/setup-supabase-account`, `/docs/setup-service-account`); install.md first in "Start here" followed by the three setups; Concepts moved to "Using Pectus".

## v0.3.4 — Project sidebar nav

- New left sidebar in project routes lists Dashboard + per-active-app groups (Content Hub when activated, with Pages / Articles / Site URL / Redirects) + Settings.
- Bare `/projects/<code>` redirects to `/dashboard`.

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
- New tables `activated_apps` (install-level) and `app_config`
  (per-project), in migration `0006_activated_apps.sql`. Backfill
  auto-activates content-hub for any v0.2 install where a project has
  `mount_slug` or `content_hub_repo` set, so upgrading does not hide
  Articles or Pages surfaces.
- Project tabs Pages and Articles, plus Settings → Site URL and
  Redirects, are now gated on content-hub activation. Inactive surfaces
  render an `ActivateAppPointer` linking to `/apps`.
- New per-project activation wizard at
  `/apps/content-hub/activate`. Captures site shape (Brand new vs
  Existing site), mount slug, and GitHub repo. Replaces the
  corresponding prompts in `npx pectus project create`.
- `npx pectus project create` now collects only identity (name, code,
  locale) and seed keywords. Site shape and repo move into the
  activation wizard.
- Project dashboard checklist makes Activate Content Hub the second
  item (after Brand). Articles import only renders once content-hub is
  active.
- Install runbook (`pectus.md`) reorganized: step 10 collects only
  project identity; new step 11 walks Content Hub activation in the
  CMS Apps tab.
- `apps/content-hub/APP.md` added, declaring the `cms_surfaces` it
  contributes. Phase 1 reads only the basic frontmatter; Phase 2
  generalizes the manifest format.

Backwards compat: existing v0.2 installs upgrading via
`npx pectus update` get content-hub auto-activated and the prior
mount_slug / repo / branch values written into
`app_config`. Net effect: nothing disappears.

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
- Project patterns updated in `package.json`. CMS path aliases in `cms/tsconfig.json` updated to point at `connectors/`.

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
- Projects gain `mode` (seed/live), `default_locale`, `enabled_locales`,
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

- New `Pages` entry in project nav.
- New route `/projects/[code]/apps/content-hub/pages` renders the indented site-plan tree
  with status / template / intent badges, child counts, locale chips.
- Plan actions: "Plan a pillar" (topic chooser dropdown) and "Plan full
  site" buttons invoke `plan-sitemap` and persist suggested nodes.
- Suggested nodes render with ✓ Adopt and ✕ Dismiss inline.
- Mobile auto-collapses children at depth 2+.

**CMS — Create Page flow (PR11):**

- Click a planned tree node → `/projects/[code]/apps/content-hub/pages/new?nodeId=X`.
- Two-step picker: Purpose (six options) + Template (cards, with the
  plan's suggestion highlighted).
- Submit creates `pages` + `page_variants` rows with blocks initialised from
  the template's `default_blocks`, marks linked topic as `planned`, redirects
  to the builder.

**CMS — Builder (PR12 partial):**

- New route `/projects/[code]/apps/content-hub/pages/builder/[variantId]`.
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
- Migration `0002` updated to NOT add `project.mode` (no longer needed).
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
- PR14: install flow updates for greenfield vs coexist (mount slug prompt). Project Settings → Site URL admin section.
- PR15: locale variant management UI in the builder (locale switcher, per-variant slug, status chips on tree).
- PR16 finish: project settings UI for managing seed keywords (add/remove). Project creation flow gains the seed-keyword prompt for greenfield. "Refresh insights" button with cost-warning modal.

**Deferred to v0.3+ (insights architecture):**

- `apps/gsc/insights/`, `apps/ga4/insights/`, `apps/google-ads/insights/`, `apps/meta/insights/`, `apps/linkedin/insights/` — interpretation skills for each connected data source.
- `apps/answer-public/insights/` — wrap the existing AnswerThePublic raw input.
- As each new insights skill lands, the corresponding raw gatherer in `weekly-analysis` retires.

## What's next (older v0.1 punch list, kept for context)

- **PR2**: port `connectors/supabase/`, `connectors/google/`, `connectors/anthropic/` from content-hub-cms.
- **PR3**: port the CMS (projects shell, brand, ICP, keywords, performance, admin, reviews). Generator routes stripped.
- **PR4**: implement the five skills with full prompts and Zod schemas. Add `write-post` and `make-it` skills.
- **PR5**: port the Astro `content-hub` app with neutral default styling. Implement the CLI commands. End-to-end install test.
- **PR6**: ship inbound apps (`ga4`, `google-ads`, `meta`, `linkedin`) and outbound apps (`wordpress`, `storyblok`).
