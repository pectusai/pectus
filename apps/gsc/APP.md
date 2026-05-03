---
name: gsc
description: Pull organic search performance from Google Search Console into the keywords table and gsc_daily time-series.
type: inbound
version: 1.0.0
needs:
  workspace: [locale, market]
inputs:
  - workspace_id
  - date_range
outputs:
  - keyword_rows
  - gsc_daily_rows
schema: ./schema.ts
---

# GSC inbound app

Pulls organic search performance from the Google Search Console API. Inbound app — no model invocation. The runner calls `fetch.ts` directly.

## What it fetches

Two grains:

- **Aggregated last-28-days** per query: impressions, clicks, average position, CTR. Updates the `keywords` table fields `gsc_impressions`, `gsc_clicks`, `gsc_position` so skills like `weekly-analysis` can read them inline.
- **Daily time-series** per (date, query, page) up to a configurable history window (default 90 days). Lands in `gsc_daily` for trend analysis (rising queries, position shifts).

## How auth works

Reuses the shared Google service account configured via `npx pectus connect google`. No app-specific credentials.

The service account must have viewer access on the GSC property the workspace tracks. The CMS workspace settings page also exposes a domain verification helper for cases where the install user isn't an existing GSC owner.

## Per-workspace settings

Stored in the `integrations` table:

- `gsc_site_url` — the verified GSC property. Either URL-prefix form (`https://example.com/`) or domain form (`sc-domain:example.com`).

Populated via `npx pectus connect gsc --workspace <code>` or the CMS workspace settings page.

## Output tables

- `keywords` (existing) — updates the GSC-related fields on each keyword row.
- `gsc_daily` (new in PR6) — `(workspace_id, date, query, page, impressions, clicks, position)`.

Migrations land at `connectors/supabase/migrations/0004_gsc_daily.sql` (added in PR6). The `keywords` schema already contains the GSC fields, so no migration is required for the aggregated grain.

## Invoke

```
npx pectus app fetch gsc --workspace <code> --since 2026-04-01 --until 2026-04-30
```

Default invocation (no args) fetches the last 28 days at the aggregated grain plus the last 7 days at the daily grain.

## Notes

The bulk of the API client already lives in `connectors/google/gsc.ts`. This app wraps it and normalizes output into the table shapes the runner persists. The connector handles auth, retries, and pagination; the app handles fetch orchestration and shape mapping.
