---
name: google-ads
description: Pull paid search performance from Google Ads into the ad_metrics table.
type: inbound
version: 1.0.0
needs:
  project: [locale, market]
inputs:
  - project_id
  - date_range
outputs:
  - ad_metric_rows
config:
  - GOOGLE_ADS_DEVELOPER_TOKEN
  - GOOGLE_ADS_LOGIN_CUSTOMER_ID
schema: ./schema.ts
---

# Google Ads inbound app

Pulls campaign, ad-group, and keyword performance from the Google Ads API. Inbound app — no model invocation. The runner calls `fetch.ts` directly.

## What it fetches

- Campaign-level: cost, clicks, impressions, conversions, conversion value, search lost IS (budget + rank)
- Ad-group-level: same metrics, scoped to ad group
- Keyword-level: same metrics plus quality score and search lost IS by keyword

All metrics are dimensioned by date and customer ID.

## How auth works

Two credentials at the global level:

- `GOOGLE_ADS_DEVELOPER_TOKEN` — Google Ads Developer token. Apply at https://ads.google.com/aw/apicenter.
- `GOOGLE_ADS_LOGIN_CUSTOMER_ID` — the manager (MCC) account ID Pectus authenticates as. Without it, the API rejects requests on linked customer accounts.

Per-project, the `integrations` table holds:

- `google_ads_customer_id` — the customer (advertiser) account whose data this project pulls.

OAuth token is shared with `connectors/google/oauth.ts`. The Google Ads scope (`https://www.googleapis.com/auth/adwords`) needs to be in the consent screen at install time.

## Output table

`ad_metrics`, with `channel = 'google_ads'`. Columns: `project_id`, `date`, `channel`, `level` (campaign/ad_group/keyword), `entity_id`, `entity_name`, `metric_name`, `value`, `dimensions` (JSONB).

Migrations land at `connectors/supabase/migrations/0003_ad_metrics.sql` (added in PR6).

## Invoke

```
npx pectus app fetch google-ads --project <code> --since 2026-04-01 --until 2026-04-30
```
