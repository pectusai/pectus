import type {
  GscFetchResultOutput,
  KeywordAggregateRowOutput,
  GscDailyRowOutput,
} from "./schema";
import {
  fetchGscQueryRows,
  fetchGscDailyByQueryPage,
} from "../../connectors/google/gsc";
import type { ServiceAccountKey } from "../../connectors/google/service-account";

const AGGREGATE_WINDOW_DAYS = 28;
const DAILY_WINDOW_DAYS = 7;

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  return formatDate(new Date(Date.now() - n * 24 * 3600 * 1000));
}

export async function fetchGsc({
  projectId,
  siteUrl,
  key,
  since,
  until,
}: {
  projectId: string;
  siteUrl: string;
  key: ServiceAccountKey;
  since?: string;
  until?: string;
}): Promise<GscFetchResultOutput> {
  const today = formatDate(new Date());
  const aggregateUntil = until ?? today;
  const aggregateSince = since ?? daysAgo(AGGREGATE_WINDOW_DAYS);
  const dailySince = since ?? daysAgo(DAILY_WINDOW_DAYS);
  const dailyUntil = until ?? today;

  const aggregateRes = await fetchGscQueryRows(key, siteUrl, "", AGGREGATE_WINDOW_DAYS);
  if (!aggregateRes.ok) {
    throw new Error(aggregateRes.error);
  }
  const keywordRows: KeywordAggregateRowOutput[] = aggregateRes.rows.map((r) => ({
    project_id: projectId,
    query: r.query,
    impressions: r.impressions,
    clicks: r.clicks,
    position: r.position,
    ctr: r.ctr,
    window_days: AGGREGATE_WINDOW_DAYS,
  }));

  const dailyRes = await fetchGscDailyByQueryPage(key, siteUrl, dailySince, dailyUntil);
  if (!dailyRes.ok) {
    throw new Error(dailyRes.error);
  }
  const dailyRows: GscDailyRowOutput[] = dailyRes.rows.map((r) => ({
    project_id: projectId,
    date: r.date,
    query: r.query,
    page: r.page,
    impressions: r.impressions,
    clicks: r.clicks,
    position: r.position,
  }));

  return {
    project_id: projectId,
    site_url: siteUrl,
    range: { since: aggregateSince, until: aggregateUntil },
    keyword_rows: keywordRows,
    gsc_daily_rows: dailyRows,
    fetched_at: new Date().toISOString(),
    keyword_row_count: keywordRows.length,
    daily_row_count: dailyRows.length,
  };
}
