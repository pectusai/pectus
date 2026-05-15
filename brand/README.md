# Brand

Your brand profile. Edited via the CMS Brand page or directly in `brand.json`.

## What's here

- `brand.json` — structured fields: name, tagline, colors, fonts, voice keywords, tonality keywords, image model preference.
- `guidelines.md` — long-form brand reference (story, voice expansion, vocabulary do/don't lists).
- `logo.svg` — your logo. Replaced during install via `npx pectus brand`.
- `reference-images/` — photography reference for image generation (future). Gitignored.

## How brand syncs to Supabase

The CMS reads `brand.json` on first run, syncs into the `brand_profile` Supabase row. After that, edits made via `/brand` in the CMS write back to both the row and `brand.json`. The file stays the source of truth — Supabase is a runtime cache.

This means:
- Your brand survives a Supabase reset (just re-sync from `brand.json`).
- Installed apps (the pre-installed `content-insights`, plus any community publisher) can read brand at build time without DB access.
- Your fork's brand is portable (committed to git).
