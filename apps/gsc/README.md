# gsc — Google Search Console inbound app

Pulls organic search performance into the `keywords` table (aggregated) and the `gsc_daily` table (time-series). Skills like `weekly-analysis` already read from `keywords`; this app keeps those rows fresh.

## Auth

Reuses the shared Google service account configured via `npx pectus connect google`. No app-specific credentials.

The service account must have viewer access on the GSC property. Pectus can verify a domain on the user's behalf if they're not already an owner; that flow is exposed in the CMS project settings page.

## Per-project settings

Stored in the `integrations` table:

- `gsc_site_url` — verified property (`https://example.com/` or `sc-domain:example.com`).

## Setup

```
npx pectus connect gsc --project <code>
```

## Schedule

```
npx pectus app fetch gsc --project <code> --since <YYYY-MM-DD> --until <YYYY-MM-DD>
```

Default invocation (no args) fetches the last 28 days at the aggregated grain plus the last 7 days at the daily grain. The CMS schedules a daily refresh per project.

## Output

- Updates `keywords.gsc_impressions`, `keywords.gsc_clicks`, `keywords.gsc_position` for matching project + query rows.
- Inserts daily rows into `gsc_daily` for trend analysis (rising queries, position shifts, page-level moves).

## Service docs

- Search Console API: https://developers.google.com/webmaster-tools/v1/api_reference_index
- searchanalytics.query: https://developers.google.com/webmaster-tools/v1/searchanalytics/query
- API quotas: https://developers.google.com/webmaster-tools/v1/limits

## Related

- Connector underneath: `connectors/google/` (specifically `gsc.ts`, which already implements the API client).
- Integrations setup walkthrough: https://pectus.ai/docs/integrations
