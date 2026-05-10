# cms/

Next.js 16 + React 19 + Tailwind v4 app. Single Postgres-backed admin used by the install owner.

## Styling policy

**Default to Tailwind utilities inline on JSX.** Reserve `.pectus-*` classes in `src/app/globals.css` for cases where you need:
- Descendant or pseudo selectors (`.pectus-foo h2`, `.pectus-bar:hover`).
- A keyframes animation that styles a reusable element.
- A surface with many properties already grouped under one named class that pre-dates this policy.

When you add a new component, write Tailwind utilities directly. Don't add a new `.pectus-foo` class to globals.css unless one of the cases above applies.

When you remove a component, remove its `.pectus-*` rules from globals.css in the same commit. Otherwise dead CSS accumulates and the file becomes noise. (We deleted ~95 dead rules / 890 lines on 2026-05-10 from this kind of drift.)

## Tailwind v4 cascade gotchas

The cascade order is: `unlayered > @layer utilities > @layer components > @layer base > @layer theme`. Custom rules in globals.css are **unlayered**, so they win against Tailwind preflight (which is in `@layer base`). Specificity is compared after layer priority, so element selectors in preflight (`h2`, `button`, `a`) lose to any unlayered class selector.

But preflight DOES strip element-default styling that you may not realize you depend on:
- `h1..h6 { font-size: inherit; font-weight: inherit }` — headings render at body size unless you scope them.
- `button { background-color: transparent; border-radius: 0 }` — buttons need explicit styling.
- `a { color: inherit; text-decoration: inherit }` — links don't auto-underline or color.
- `ol, ul { list-style: none }` — lists don't bullet.

If you want HTML-element defaults inside a writable surface (TipTap, markdown render), scope them under a wrapper class (see `.tiptap h2 { ... }` in globals.css for the pattern).

## Routing

App router. Routes that need the chrome of the signed-in CMS go under `(app)/`. Layouts:
- `app/layout.tsx` — root, imports globals.css and Inter font.
- `app/(app)/layout.tsx` — top NavBar + MigrationBanner gate.
- `app/(app)/brands/[slug]/projects/[code]/layout.tsx` — `<ProjectShell>` with sidebar + `<main>`.

Public pages (login, signup, the `/pectus-preview/[draftId]` iframe view used by Pages builder) live outside `(app)/`.

## Data access

Server components read via `createServerClient()` (cookie-bound). Server actions that write to admin-tables (e.g., the `integrations` table holding API keys) use `createServiceClient()` directly — Pectus is single-user mode, so RLS is defense-in-depth, not the primary access control.

Migrations live in `connectors/supabase/migrations/`. The CMS's `/settings/updates` page applies new migrations via the Supabase Management API on the user's behalf — don't tell the user to paste SQL by hand for a new migration.
