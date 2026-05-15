---
name: seed-keywords
type: inbound
data_acquisition: manual
description: 5-10 user-typed seed keywords used as a starting signal when a project has no live traffic yet (or as a supplementary signal alongside live data)
version: 0.1.0
---

# seed-keywords

A minimal inbound app for user-typed seed keywords. Used to bootstrap projects that don't yet have GSC / GA4 traffic, and as a supplementary signal for any project that wants to nudge analysis toward specific topics the data doesn't yet capture.

## What this app provides

- A project-scoped table of user-typed keywords (`seed_keywords`, defined in migration `0002_v0_2_pages.sql`).
- A project settings UI for adding / removing seed keywords.
- An interpretation skill (`apps/seed-keywords/insights/`) that turns the keyword list into Insights consumed by `weekly-analysis` and `plan-sitemap`.

## Why "minimal app"

Seed keywords don't fit the usual inbound app shape because there's no external API to fetch from — the data is user-typed. So this app folder has only `APP.md` and `insights/`. No `provision.ts` (the migration handles table setup), no `fetch.ts` (data is already in the table after the user types it).

The minimal-app pattern generalises: any other "user-typed data source" (CSV uploads, manual competitor lists) can follow the same shape.

## Recommended count

5-10 keywords. Smaller than you'd think. The interpretation skill expects focus, not volume — too many seed keywords dilute the signal and produce diffuse insights. Users with bigger keyword lists should connect a real data source (CSV upload as a separate app, GSC, etc.) rather than dump into the seed list.

## What the interpretation produces

`Insight[]` rows with these types:

- `topic_candidate` — clusters of seed keywords that suggest a topic worth a pillar. Carries a `topic_hint` plan-sitemap can adopt.
- `intent_gap` — flags when the seed list is missing an intent type (e.g. "all informational, no commercial" suggests buyer-stage coverage is missing).
- `audience_alignment` — notes seed keywords that strongly map to an ICP painpoint or persona.
- `weak_signal` — flags seed keywords that look generic or low-volume; suggests reframing.

See `insights/SKILL.md` for the full prompt and `insights/schema.ts` for the per-type evidence shapes.
