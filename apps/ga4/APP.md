---
name: ga4
description: Pull web analytics from Google Analytics 4 into the analytics_metrics table.
type: inbound
version: 1.0.0
needs:
  project: [locale, market]
inputs:
  - project_id
  - date_range
outputs:
  - analytics_rows
config:
  - GA4_PROPERTY_ID_PER_PROJECT
schema: ./schema.ts
---

# GA4 inbound app

Inbound apps are API wrappers; the model is not invoked. The runner calls `fetch.ts` directly with the project's configured GA4 property and a date range, fetches metrics from the GA4 Data API, and writes rows to `analytics_metrics`.

## What it fetches

- Sessions, total users, new users
- Pageviews, screen views, average engagement time
- Top landing pages, top exit pages
- Top traffic sources and mediums
- Conversions (events the user has marked as conversions in GA4)

All metrics are dimensioned by date, page path (where applicable), and source/medium (where applicable).

## How auth works

Auth uses the shared Google service-account credential set up via `npx pectus connect google`. This app does not collect its own credentials — the GA4 property selected per project is stored in the `integrations` table, populated via the CMS project settings.

## Output table

`analytics_metrics`. Columns: `project_id`, `date`, `metric_name`, `value`, `dimensions` (JSONB).

The shared `analytics_metrics` table lives in `connectors/supabase/migrations/0006_analytics_metrics.sql`. Same table is shared with future paid-media inbound apps (Google Ads, Meta, LinkedIn, Microsoft Ads) so one skill reads from all sources via `cms/src/lib/analytics.ts::readAnalyticsMetrics`.

## Invoke

The GA4 Settings page in the CMS exposes a "Refresh GA4 data now" button per project that runs `fetchGa4` against the brand's service account and configured property. Default lookback is 30 days. There is no CLI fetch command yet; everything runs from the CMS.
