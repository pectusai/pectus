# apps/seed-keywords

A minimal inbound app for **user-typed seed keywords** (5-10 of them). Bootstraps workspaces that don't yet have GSC/GA4 traffic, and acts as a supplementary signal for any workspace that wants to nudge analysis toward specific topics.

## Why "minimal"

Most inbound apps have a five-file shape: `APP.md`, `schema.ts`, `provision.ts`, `fetch.ts`, `README.md`. seed-keywords is the **manual-data variant** of the inbound app pattern:

- No `provision.ts` — table is created by migration `0002_v0_2_pages.sql`.
- No `fetch.ts` — there's no external API to fetch from. Data is user-typed via the workspace settings UI.
- No `schema.ts` at the app root — the only data shape is `{ keyword: string }`, defined inline in the migration.

The app folder therefore has just `APP.md`, `insights/`, and this README. Future "user-typed data" apps (CSV competitor lists, manual content audits) follow the same shape.

## What this app produces

`Insight[]` rows in the `insights` table, written by the interpretation skill at `insights/SKILL.md` after each plan-sitemap or weekly-analysis run that calls `runInterpretationsIfStale`.

Insight types this app produces:

- **`topic_candidate`** — clusters of seed keywords that suggest a topic worth a pillar.
- **`intent_gap`** — flags missing intent coverage in the seed list.
- **`audience_alignment`** — notes seed keywords that strongly map to ICP painpoints.
- **`weak_signal`** — flags seed keywords that look generic or off-thesis.

See `insights/SKILL.md` for the full prompt and `insights/schema.ts` for the per-type evidence shapes.

## Where users add seed keywords

Workspace settings page (lands in the PR16 finish). Until that UI ships, seeds can be inserted directly into the `seed_keywords` table for testing.

## Recommended count

5-10 keywords. Smaller than you'd think. Larger lists dilute the signal — users with bigger keyword sets should connect a real source (GSC) or, in v0.3+, upload via a future CSV-keywords app.
