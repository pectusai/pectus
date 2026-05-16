---
name: gsc
description: Pull organic search performance from Google Search Console into the keywords table and gsc_daily time-series.
type: inbound
version: 1.0.0
needs:
  project: [locale, market]
inputs:
  - project_id
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

The service account must have viewer access on the GSC property the project tracks. The CMS project settings page also exposes a domain verification helper for cases where the install user isn't an existing GSC owner.

## Per-project settings

Stored in the `integrations` table:

- `gsc_site_url` — the verified GSC property. Either URL-prefix form (`https://example.com/`) or domain form (`sc-domain:example.com`).

Populated via `npx pectus connect gsc --project <code>` or the CMS project settings page.

## Output tables

- `keywords` (existing) — updates the GSC-related fields on each keyword row.
- `gsc_daily` (new in PR6) — `(project_id, date, query, page, impressions, clicks, position)`.

The `gsc_daily` table lives in `connectors/supabase/migrations/0006_analytics_metrics.sql` alongside the cross-source `analytics_metrics` table. The aggregated grain writes into `keywords.metadata`, no schema change required.

## Invoke

The Search Console Settings page in the CMS exposes a "Refresh Search Console data now" button. Default fetch is the last 28 days at the aggregated grain plus the last 7 days at the daily grain. There is no CLI fetch command yet; everything runs from the CMS.

## Notes

The bulk of the API client already lives in `connectors/google/gsc.ts`. This app wraps it and normalizes output into the table shapes the runner persists. The connector handles auth, retries, and pagination; the app handles fetch orchestration and shape mapping.
