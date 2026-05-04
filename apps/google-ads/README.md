# google-ads — Google Ads inbound app

Pulls campaign, ad-group, and keyword performance into the `ad_metrics` table with `channel='google_ads'`. Skills consume the table; this app populates it.

## Auth

Two install-level credentials:

- `GOOGLE_ADS_DEVELOPER_TOKEN` — apply at https://ads.google.com/aw/apicenter
- `GOOGLE_ADS_LOGIN_CUSTOMER_ID` — manager (MCC) account ID

Plus per-project `google_ads_customer_id` in the `integrations` table.

OAuth is shared with the Google connector. The Google Ads scope (`https://www.googleapis.com/auth/adwords`) must be in the install-time consent screen.

## Setup

```
npx pectus connect google-ads --project <code>
```

Walks the user through getting the developer token, picking the MCC, picking the customer to track for this project, and running a test query.

## Schedule

```
npx pectus app fetch google-ads --project <code> --since <YYYY-MM-DD> --until <YYYY-MM-DD>
```

## Service docs

- Google Ads API: https://developers.google.com/google-ads/api/docs/start
- Developer token application: https://ads.google.com/aw/apicenter
- GAQL reference: https://developers.google.com/google-ads/api/docs/query/overview
- Setup walkthrough: https://pectus.ai/docs/integrations/google-ads
