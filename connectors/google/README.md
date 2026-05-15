# connectors/google

Google Search Console and Google Analytics 4. Two auth paths:

- **OAuth** — for user-attributed reads (admin signing in as themselves).
- **Service account** — for unattended reads (cron analysis runs).

## Env vars

```
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
```

Service account JSON is uploaded via the CMS Brand page and stored in the `integrations` Supabase table — not in env. This keeps it rotatable without a redeploy.

## What's in this folder

- `oauth.ts` — OAuth 2.0 authorization code flow. Ported from content-insights-cms in PR2.
- `service-account.ts` — service account JWT minting + access token caching. Ported from content-insights-cms in PR2.
- `gsc.ts` — Search Console: per-URL queries, impressions, clicks, position.
- `ga4.ts` — Analytics 4: page-level engagement and conversion metrics.

## Required scopes

- `https://www.googleapis.com/auth/analytics.readonly`
- `https://www.googleapis.com/auth/webmasters.readonly`
- `https://www.googleapis.com/auth/userinfo.email`

## Required APIs (enable in Google Cloud Console)

- Search Console API
- Google Analytics Data API

Upstream service docs: https://developers.google.com/search/apis, https://developers.google.com/analytics/devguides/reporting/data/v1
