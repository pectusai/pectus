import { createServiceClient } from "@pectus/supabase";

export type AnalyticsRow = {
  project_id: string;
  source: string;
  date: string;
  metric_name: string;
  value: number;
  dimensions: Record<string, unknown>;
  fetched_at: string;
};

export type ReadAnalyticsArgs = {
  projectId: string;
  sources?: string[];
  metricNames?: string[];
  since?: string;
  until?: string;
  limit?: number;
};

export async function readAnalyticsMetrics(
  args: ReadAnalyticsArgs,
): Promise<AnalyticsRow[]> {
  const supabase = createServiceClient();
  let q = supabase
    .from("analytics_metrics")
    .select("project_id, source, date, metric_name, value, dimensions, fetched_at")
    .eq("project_id", args.projectId)
    .order("date", { ascending: true });
  if (args.sources && args.sources.length > 0) {
    q = q.in("source", args.sources);
  }
  if (args.metricNames && args.metricNames.length > 0) {
    q = q.in("metric_name", args.metricNames);
  }
  if (args.since) q = q.gte("date", args.since);
  if (args.until) q = q.lte("date", args.until);
  if (args.limit) q = q.limit(args.limit);
  const { data, error } = await q;
  if (error) throw new Error(`Analytics read failed: ${error.message}`);
  return (data ?? []) as AnalyticsRow[];
}

export type DailyTotal = {
  date: string;
  source: string;
  metric_name: string;
  value: number;
};

export function aggregateByDate(rows: AnalyticsRow[]): DailyTotal[] {
  const acc = new Map<string, DailyTotal>();
  for (const r of rows) {
    const key = `${r.date}|${r.source}|${r.metric_name}`;
    const prior = acc.get(key);
    if (prior) {
      prior.value += r.value;
    } else {
      acc.set(key, {
        date: r.date,
        source: r.source,
        metric_name: r.metric_name,
        value: r.value,
      });
    }
  }
  return [...acc.values()].sort((a, b) =>
    a.date === b.date
      ? a.source === b.source
        ? a.metric_name.localeCompare(b.metric_name)
        : a.source.localeCompare(b.source)
      : a.date.localeCompare(b.date),
  );
}

export type BlendedCpaRow = {
  date: string;
  spend: number;
  conversions: number;
  blended_cpa: number | null;
};

export async function readBlendedCpa(args: {
  projectId: string;
  since: string;
  until: string;
  conversionsSource?: string;
  paidSources?: string[];
}): Promise<BlendedCpaRow[]> {
  const paidSources = args.paidSources ?? [
    "google_ads",
    "meta_ads",
    "linkedin_ads",
    "microsoft_ads",
    "tiktok_ads",
  ];
  const conversionsSource = args.conversionsSource ?? "ga4";

  const [spendRows, convRows] = await Promise.all([
    readAnalyticsMetrics({
      projectId: args.projectId,
      sources: paidSources,
      metricNames: ["spend"],
      since: args.since,
      until: args.until,
    }),
    readAnalyticsMetrics({
      projectId: args.projectId,
      sources: [conversionsSource],
      metricNames: ["conversions"],
      since: args.since,
      until: args.until,
    }),
  ]);

  const spendByDate = new Map<string, number>();
  for (const r of spendRows) {
    spendByDate.set(r.date, (spendByDate.get(r.date) ?? 0) + r.value);
  }
  const convByDate = new Map<string, number>();
  for (const r of convRows) {
    if (Object.keys(r.dimensions).length === 0) {
      convByDate.set(r.date, (convByDate.get(r.date) ?? 0) + r.value);
    }
  }

  const dates = new Set<string>([...spendByDate.keys(), ...convByDate.keys()]);
  const out: BlendedCpaRow[] = [];
  for (const date of [...dates].sort()) {
    const spend = spendByDate.get(date) ?? 0;
    const conversions = convByDate.get(date) ?? 0;
    out.push({
      date,
      spend,
      conversions,
      blended_cpa: conversions > 0 ? spend / conversions : null,
    });
  }
  return out;
}
