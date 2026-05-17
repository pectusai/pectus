import { createServiceClient } from "@pectus/supabase";

type Supabase = ReturnType<typeof createServiceClient>;

export type Ga4DailyRow = {
  date: string;
  sessions: number;
  totalUsers: number;
  newUsers: number;
  pageviews: number;
  engagedSessions: number;
  averageEngagementTime: number;
  conversions: number;
};

export type Ga4PageRow = {
  page_path: string;
  sessions: number;
  pageviews: number;
  conversions: number;
  conversion_rate: number | null;
};

export type Ga4SourceRow = {
  source: string;
  medium: string;
  sessions: number;
  conversions: number;
};

export type Ga4Gather = {
  daily: Ga4DailyRow[];
  topPages: Ga4PageRow[];
  topSources: Ga4SourceRow[];
  hasAnyData: boolean;
  windowSince: string;
  windowUntil: string;
};

const LOOKBACK_DAYS = 30;
const TOP_PAGES = 50;
const TOP_SOURCES = 20;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

type Row = {
  date: string;
  metric_name: string;
  value: number;
  dimensions: Record<string, unknown>;
};

function dimOf(r: Row, key: string): string | null {
  const v = r.dimensions?.[key];
  if (typeof v === "string" && v.length > 0) return v;
  return null;
}

function isOverall(r: Row): boolean {
  return (
    dimOf(r, "page_path") === null &&
    dimOf(r, "source") === null &&
    dimOf(r, "medium") === null
  );
}

export async function gatherGa4(
  supabase: Supabase,
  projectId: string,
): Promise<Ga4Gather> {
  const until = isoDate(new Date());
  const since = isoDate(new Date(Date.now() - LOOKBACK_DAYS * 24 * 3600 * 1000));

  const { data, error } = await supabase
    .from("analytics_metrics")
    .select("date, metric_name, value, dimensions")
    .eq("project_id", projectId)
    .eq("source", "ga4")
    .gte("date", since)
    .lte("date", until);
  if (error) throw new Error(`GA4 read failed: ${error.message}`);

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) {
    return {
      daily: [],
      topPages: [],
      topSources: [],
      hasAnyData: false,
      windowSince: since,
      windowUntil: until,
    };
  }

  const dailyByDate = new Map<string, Ga4DailyRow>();
  const blankDaily = (date: string): Ga4DailyRow => ({
    date,
    sessions: 0,
    totalUsers: 0,
    newUsers: 0,
    pageviews: 0,
    engagedSessions: 0,
    averageEngagementTime: 0,
    conversions: 0,
  });
  const dailyMetricFields: Record<string, keyof Ga4DailyRow> = {
    sessions: "sessions",
    totalUsers: "totalUsers",
    newUsers: "newUsers",
    screenPageViews: "pageviews",
    pageviews: "pageviews",
    engagedSessions: "engagedSessions",
    averageEngagementTime: "averageEngagementTime",
    userEngagementDuration: "averageEngagementTime",
    conversions: "conversions",
  };
  for (const r of rows) {
    if (!isOverall(r)) continue;
    const field = dailyMetricFields[r.metric_name];
    if (!field) continue;
    if (!dailyByDate.has(r.date)) dailyByDate.set(r.date, blankDaily(r.date));
    const target = dailyByDate.get(r.date)!;
    (target[field] as number) += Number(r.value) || 0;
  }
  const daily = [...dailyByDate.values()].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  const pageAgg = new Map<
    string,
    { sessions: number; pageviews: number; conversions: number }
  >();
  for (const r of rows) {
    const page = dimOf(r, "page_path");
    if (!page) continue;
    if (dimOf(r, "source") !== null || dimOf(r, "medium") !== null) continue;
    if (!pageAgg.has(page)) {
      pageAgg.set(page, { sessions: 0, pageviews: 0, conversions: 0 });
    }
    const target = pageAgg.get(page)!;
    if (r.metric_name === "sessions") target.sessions += Number(r.value) || 0;
    else if (
      r.metric_name === "screenPageViews" ||
      r.metric_name === "pageviews"
    )
      target.pageviews += Number(r.value) || 0;
    else if (r.metric_name === "conversions")
      target.conversions += Number(r.value) || 0;
  }
  const topPages: Ga4PageRow[] = [...pageAgg.entries()]
    .map(([page_path, v]) => ({
      page_path,
      sessions: v.sessions,
      pageviews: v.pageviews,
      conversions: v.conversions,
      conversion_rate: v.sessions > 0 ? v.conversions / v.sessions : null,
    }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, TOP_PAGES);

  const sourceAgg = new Map<
    string,
    { sessions: number; conversions: number }
  >();
  for (const r of rows) {
    const source = dimOf(r, "source");
    const medium = dimOf(r, "medium");
    if (!source && !medium) continue;
    if (dimOf(r, "page_path") !== null) continue;
    const key = `${source ?? "(none)"} / ${medium ?? "(none)"}`;
    if (!sourceAgg.has(key)) sourceAgg.set(key, { sessions: 0, conversions: 0 });
    const target = sourceAgg.get(key)!;
    if (r.metric_name === "sessions") target.sessions += Number(r.value) || 0;
    else if (r.metric_name === "conversions")
      target.conversions += Number(r.value) || 0;
  }
  const topSources: Ga4SourceRow[] = [...sourceAgg.entries()]
    .map(([key, v]) => {
      const [source, medium] = key.split(" / ");
      return {
        source: source ?? "(none)",
        medium: medium ?? "(none)",
        sessions: v.sessions,
        conversions: v.conversions,
      };
    })
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, TOP_SOURCES);

  return {
    daily,
    topPages,
    topSources,
    hasAnyData: daily.length > 0 || topPages.length > 0 || topSources.length > 0,
    windowSince: since,
    windowUntil: until,
  };
}

export function formatGa4ForPrompt(g: Ga4Gather): string {
  if (!g.hasAnyData) {
    return `GA4 LAST 30 DAYS (${g.windowSince} → ${g.windowUntil})
(no traffic in window)`;
  }
  const dailyLines = g.daily.length
    ? g.daily
        .map(
          (d) =>
            `${d.date} · sessions=${d.sessions} · users=${d.totalUsers} · new=${d.newUsers} · conversions=${d.conversions} · avg_engagement_s=${d.averageEngagementTime.toFixed(1)}`,
        )
        .join("\n")
    : "(no overall rows)";
  const pageLines = g.topPages.length
    ? g.topPages
        .map((p) => {
          const cr = p.conversion_rate != null
            ? `${(p.conversion_rate * 100).toFixed(2)}%`
            : "—";
          return `${p.page_path} · sessions=${p.sessions} · pageviews=${p.pageviews} · conv=${p.conversions} · conv_rate=${cr}`;
        })
        .join("\n")
    : "(no page rows)";
  const sourceLines = g.topSources.length
    ? g.topSources
        .map(
          (s) =>
            `${s.source} / ${s.medium} · sessions=${s.sessions} · conversions=${s.conversions}`,
        )
        .join("\n")
    : "(no source rows)";

  return `GA4 LAST 30 DAYS — overall (${g.windowSince} → ${g.windowUntil})
${dailyLines}

GA4 LAST 30 DAYS — top ${TOP_PAGES} pages by sessions
${pageLines}

GA4 LAST 30 DAYS — top ${TOP_SOURCES} traffic sources
${sourceLines}`;
}
