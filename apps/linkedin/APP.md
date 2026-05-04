---
name: linkedin
description: Pull paid social performance from the LinkedIn Marketing API into the ad_metrics table.
type: inbound
stub: true
version: 1.0.0
needs:
  project: [locale, market]
inputs:
  - project_id
  - date_range
outputs:
  - ad_metric_rows
config:
  - LINKEDIN_CLIENT_ID
  - LINKEDIN_CLIENT_SECRET
  - LINKEDIN_REFRESH_TOKEN
schema: ./schema.ts
---

# LinkedIn inbound app

Pulls campaign group, campaign, and creative performance from the LinkedIn Marketing API. Inbound app — no model invocation. The runner calls `fetch.ts` directly.

## What it fetches

- Campaign-group, campaign, and creative levels
- Spend, impressions, clicks, video views, leads (Lead Gen Form submissions), conversions

All metrics are dimensioned by date and ad account.

## How auth works

LinkedIn requires Marketing Developer Platform approval and OAuth with refresh tokens (LinkedIn tokens expire after 60 days; the refresh token is long-lived).

- `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` — register an app at https://www.linkedin.com/developers and apply for the Marketing Developer Platform program.
- `LINKEDIN_REFRESH_TOKEN` — issued via the OAuth dance. `provision.ts` walks the user through getting it.

Required scopes: `r_ads`, `r_ads_reporting`, `r_organization_social`.

Per-project, the `integrations` table holds:

- `linkedin_ad_account_id` — the sponsored account ID this project pulls.

## Output table

`ad_metrics`, with `channel = 'linkedin'`. Same schema as Google Ads and Meta.

## Invoke

```
npx pectus app fetch linkedin --project <code> --since 2026-04-01 --until 2026-04-30
```
