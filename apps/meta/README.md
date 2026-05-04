# meta — Meta Marketing API inbound app

Pulls Facebook + Instagram paid social performance into the `ad_metrics` table with `channel='meta'`. Skills consume the table; this app populates it.

## Auth

Three install-level credentials, all collected by `provision.ts`:

- `META_APP_ID`, `META_APP_SECRET` — register a Meta App at https://developers.facebook.com/apps with the Marketing API product enabled.
- `META_SYSTEM_USER_TOKEN` — long-lived token issued to a System User in Business Manager. Required scopes: `ads_read`, `business_management`.

Plus per-project `meta_ad_account_id` (the `act_<id>` form) in the `integrations` table.

## Setup

```
npx pectus connect meta --project <code>
```

## Schedule

```
npx pectus app fetch meta --project <code> --since <YYYY-MM-DD> --until <YYYY-MM-DD>
```

## Service docs

- Marketing API overview: https://developers.facebook.com/docs/marketing-apis
- Insights endpoint: https://developers.facebook.com/docs/marketing-api/insights
- System Users: https://developers.facebook.com/docs/marketing-api/system-users/overview
- Setup walkthrough: https://pectus.ai/docs/integrations/meta
