# Changelog

## v0.1.0 — Initial scaffold (PR1)

- Repo skeleton: `apps/`, `skills/`, `knowledge/`, `brand/`, `cms/`, `hub-template/`, `cli/`, `docs/`.
- Root files: `pectus.md`, `CLAUDE.md`, `AGENTS.md`, `README.md`, `.env.example`, `.gitignore`, `package.json`.
- Five seed skills with `SKILL.md` and stub schemas: `weekly-analysis`, `seo-strategy`, `jobs-to-be-done`, `internal-linking`, `knowledge-digest`.
- Connector READMEs and stubs for Supabase, Google, Anthropic, Vercel, GitHub.
- CLI command stubs.
- Docs: `architecture.md`, `skills-spec.md`, `upgrading.md`, `faq.md`.

No runnable code yet. PR2–PR5 land the actual ports.

## What's next

- **PR2**: port `apps/supabase/`, `apps/google/`, `apps/anthropic/` from content-hub-cms.
- **PR3**: port the CMS — workspaces shell, brand, ICP, keywords, performance, admin, reviews. Generator routes stripped.
- **PR4**: implement the five skills with full prompts and Zod schemas.
- **PR5**: port the Astro hub-template with neutral default styling. Implement the CLI commands. End-to-end install test.
