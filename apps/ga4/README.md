# ga4 — Google Analytics 4 inbound app

Pulls web analytics into the `analytics_metrics` table. Skills like `weekly-analysis` consume the table; this app populates it.

## Auth

Reuses the shared Google service account configured via `npx pectus connect google`. No app-specific credentials.

## Per-project settings

Stored in the `integrations` table:

- `ga4_property_id` — the GA4 property to track for this project.

Populated via `npx pectus connect ga4 --project <code>` or the CMS project settings page.

## Schedule

Manual via:

```
npx pectus app fetch ga4 --project <code> --since <YYYY-MM-DD> --until <YYYY-MM-DD>
```

Or scheduled by the CMS to run daily for each project with a configured property.

## Output

Writes to `analytics_metrics`. One row per (date, metric_name, dimension-set). Skills query by date range and metric name.

## Service docs

- GA4 Data API: https://developers.google.com/analytics/devguides/reporting/data/v1
- API quotas: https://developers.google.com/analytics/devguides/reporting/data/v1/quotas

## Related

- Setup walkthrough: https://pectus.ai/docs/integrations
- Connector underneath: `connectors/google/`
