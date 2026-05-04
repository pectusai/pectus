---
name: meta
description: Pull paid social performance from the Meta Marketing API into the ad_metrics table.
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
  - META_APP_ID
  - META_APP_SECRET
  - META_SYSTEM_USER_TOKEN
schema: ./schema.ts
---

# Meta inbound app

Pulls campaign, ad-set, and ad performance from the Meta Marketing API (Facebook + Instagram). Inbound app — no model invocation. The runner calls `fetch.ts` directly.

## What it fetches

- Campaign-level: spend, impressions, reach, clicks, link clicks, conversions (purchases, leads, sign-ups, app installs)
- Ad-set-level: same metrics, scoped to ad set
- Ad-level: same metrics, scoped to ad creative

All metrics are dimensioned by date and ad account.

## How auth works

Meta requires its own app and System User token — there is no shared connector to reuse, so this app collects all credentials directly.

- `META_APP_ID`, `META_APP_SECRET` — register a Meta App at https://developers.facebook.com/apps and add the Marketing API product.
- `META_SYSTEM_USER_TOKEN` — long-lived token issued to a System User in the Business Manager. Required scopes: `ads_read`, `business_management`.

Per-project, the `integrations` table holds:

- `meta_ad_account_id` — the `act_<id>` ad account whose data this project pulls.

## Output table

`ad_metrics`, with `channel = 'meta'`. Same schema as Google Ads.

## Invoke

```
npx pectus app fetch meta --project <code> --since 2026-04-01 --until 2026-04-30
```
