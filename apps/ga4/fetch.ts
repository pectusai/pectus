import type { Ga4FetchResultOutput, AnalyticsRowOutput } from "./schema";
import { fetchGa4DailyMetrics } from "../../connectors/google/ga4";
import type { ServiceAccountKey } from "../../connectors/google/service-account";

export async function fetchGa4({
  projectId,
  propertyId,
  key,
  since,
  until,
}: {
  projectId: string;
  propertyId: string;
  key: ServiceAccountKey;
  since: string;
  until: string;
}): Promise<Ga4FetchResultOutput> {
  const res = await fetchGa4DailyMetrics(key, propertyId, since, until);
  if (!res.ok) {
    throw new Error(res.error);
  }

  const rows: AnalyticsRowOutput[] = res.rows.map((r) => ({
    project_id: projectId,
    date: r.date,
    metric_name: r.metric_name,
    value: r.value,
    dimensions: {
      page_path: r.dimensions.page_path ?? null,
      source: r.dimensions.source ?? null,
      medium: r.dimensions.medium ?? null,
      campaign: null,
      country: null,
    },
  }));

  return {
    project_id: projectId,
    property_id: propertyId,
    range: { since, until },
    rows,
    fetched_at: new Date().toISOString(),
    row_count: rows.length,
  };
}
