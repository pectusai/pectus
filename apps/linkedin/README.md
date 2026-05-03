# linkedin — LinkedIn Marketing API inbound app

Pulls LinkedIn paid social performance into the `ad_metrics` table with `channel='linkedin'`. Skills consume the table; this app populates it.

## Auth

Three install-level credentials, all collected by `provision.ts`:

- `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` — register at https://www.linkedin.com/developers
- `LINKEDIN_REFRESH_TOKEN` — issued via OAuth. Long-lived; used to mint short-lived access tokens.

Plus per-workspace `linkedin_ad_account_id` in the `integrations` table.

## Required scopes

`r_ads`, `r_ads_reporting`, `r_organization_social`. These come with Marketing Developer Platform approval, which is a separate application step at https://www.linkedin.com/developers/apps.

## Setup

```
npx pectus connect linkedin --workspace <code>
```

## Schedule

```
npx pectus app fetch linkedin --workspace <code> --since <YYYY-MM-DD> --until <YYYY-MM-DD>
```

## Service docs

- LinkedIn Marketing API: https://learn.microsoft.com/en-us/linkedin/marketing
- Ad Analytics endpoint: https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads/reporting/ads-reporting
- Marketing Developer Platform: https://learn.microsoft.com/en-us/linkedin/marketing/getting-access
- Setup walkthrough: https://pectus.ai/docs/integrations/linkedin
