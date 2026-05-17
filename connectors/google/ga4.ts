import { type ServiceAccountKey, getAccessToken } from "./service-account";

export type Ga4LandingPageRow = {
  landingPage: string;
  sessions: number;
  leads: number;
};

export type Ga4DailyMetricRow = {
  date: string;
  metric_name:
    | "sessions"
    | "total_users"
    | "new_users"
    | "pageviews"
    | "avg_engagement_time_seconds"
    | "conversions"
    | "engaged_sessions";
  value: number;
  dimensions: {
    page_path?: string | null;
    source?: string | null;
    medium?: string | null;
  };
};

export async function testGa4Property(
  key: ServiceAccountKey,
  propertyId: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    const token = await getAccessToken(key, [
      "https://www.googleapis.com/auth/analytics.readonly",
    ]);
    const res = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
          metrics: [{ name: "activeUsers" }],
        }),
      },
    );
    if (!res.ok) {
      const body = await res.text();
      return {
        ok: false,
        message: `GA4 failed (${res.status}): ${body.slice(0, 400)}`,
      };
    }
    return { ok: true, message: "GA4 responded ok." };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function fetchGa4LandingPageMetrics(
  key: ServiceAccountKey,
  propertyId: string,
  pathPrefixes: string[],
  daysBack: number,
): Promise<{ ok: true; rows: Ga4LandingPageRow[] } | { ok: false; error: string }> {
  try {
    const token = await getAccessToken(key, [
      "https://www.googleapis.com/auth/analytics.readonly",
    ]);

    const orFilters = pathPrefixes.map((prefix) => ({
      filter: {
        fieldName: "landingPagePlusQueryString",
        stringFilter: { matchType: "BEGINS_WITH", value: prefix },
      },
    }));
    const baseFilter = { orGroup: { expressions: orFilters } };
    const dateRange = { startDate: `${daysBack}daysAgo`, endDate: "today" };

    async function runReport(metricName: string, extraFilter?: object) {
      const dimensionFilter = extraFilter
        ? { andGroup: { expressions: [baseFilter, extraFilter] } }
        : baseFilter;
      const body = {
        dateRanges: [dateRange],
        dimensions: [{ name: "landingPagePlusQueryString" }],
        metrics: [{ name: metricName }],
        dimensionFilter,
        limit: "10000",
      };
      const res = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`GA4 ${metricName} failed (${res.status}): ${text.slice(0, 400)}`);
      }
      const json = (await res.json()) as {
        rows?: Array<{
          dimensionValues?: Array<{ value?: string }>;
          metricValues?: Array<{ value?: string }>;
        }>;
      };
      const out = new Map<string, number>();
      for (const r of json.rows ?? []) {
        const lp = r.dimensionValues?.[0]?.value ?? "";
        const v = Number(r.metricValues?.[0]?.value ?? 0);
        if (lp) out.set(lp, v);
      }
      return out;
    }

    const sessions = await runReport("sessions");
    const leads = await runReport("eventCount", {
      filter: {
        fieldName: "eventName",
        stringFilter: { matchType: "EXACT", value: "lead" },
      },
    });

    const allPages = new Set<string>([...sessions.keys(), ...leads.keys()]);
    const rows: Ga4LandingPageRow[] = [];
    for (const lp of allPages) {
      rows.push({
        landingPage: lp,
        sessions: sessions.get(lp) ?? 0,
        leads: leads.get(lp) ?? 0,
      });
    }

    return { ok: true, rows };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

const METRIC_MAP: Record<string, Ga4DailyMetricRow["metric_name"]> = {
  sessions: "sessions",
  totalUsers: "total_users",
  newUsers: "new_users",
  screenPageViews: "pageviews",
  averageSessionDuration: "avg_engagement_time_seconds",
  conversions: "conversions",
  engagedSessions: "engaged_sessions",
};

function isoDate(yyyymmdd: string): string {
  if (yyyymmdd.length !== 8) return yyyymmdd;
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

async function runGa4Report(
  token: string,
  propertyId: string,
  body: object,
): Promise<{
  rows: Array<{
    dimensionValues?: Array<{ value?: string }>;
    metricValues?: Array<{ value?: string }>;
  }>;
}> {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GA4 report failed (${res.status}): ${text.slice(0, 400)}`);
  }
  const json = (await res.json()) as {
    rows?: Array<{
      dimensionValues?: Array<{ value?: string }>;
      metricValues?: Array<{ value?: string }>;
    }>;
  };
  return { rows: json.rows ?? [] };
}

export async function fetchGa4DailyMetrics(
  key: ServiceAccountKey,
  propertyId: string,
  startDate: string,
  endDate: string,
): Promise<{ ok: true; rows: Ga4DailyMetricRow[] } | { ok: false; error: string }> {
  try {
    const token = await getAccessToken(key, [
      "https://www.googleapis.com/auth/analytics.readonly",
    ]);
    const dateRange = { startDate, endDate };
    const rows: Ga4DailyMetricRow[] = [];

    const overallMetrics = [
      "sessions",
      "totalUsers",
      "newUsers",
      "screenPageViews",
      "engagedSessions",
      "averageSessionDuration",
      "conversions",
    ];
    const overall = await runGa4Report(token, propertyId, {
      dateRanges: [dateRange],
      dimensions: [{ name: "date" }],
      metrics: overallMetrics.map((name) => ({ name })),
      limit: "10000",
    });
    for (const r of overall.rows) {
      const d = isoDate(r.dimensionValues?.[0]?.value ?? "");
      r.metricValues?.forEach((m, i) => {
        const apiName = overallMetrics[i];
        const canonical = METRIC_MAP[apiName];
        if (!canonical) return;
        rows.push({
          date: d,
          metric_name: canonical,
          value: Number(m.value ?? 0),
          dimensions: {},
        });
      });
    }

    const pageMetrics = ["sessions", "screenPageViews", "conversions"];
    const byPage = await runGa4Report(token, propertyId, {
      dateRanges: [dateRange],
      dimensions: [
        { name: "date" },
        { name: "landingPagePlusQueryString" },
      ],
      metrics: pageMetrics.map((name) => ({ name })),
      limit: "50000",
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    });
    for (const r of byPage.rows) {
      const d = isoDate(r.dimensionValues?.[0]?.value ?? "");
      const page = r.dimensionValues?.[1]?.value ?? null;
      r.metricValues?.forEach((m, i) => {
        const canonical = METRIC_MAP[pageMetrics[i]];
        if (!canonical) return;
        rows.push({
          date: d,
          metric_name: canonical,
          value: Number(m.value ?? 0),
          dimensions: { page_path: page },
        });
      });
    }

    const sourceMetrics = ["sessions", "conversions"];
    const bySource = await runGa4Report(token, propertyId, {
      dateRanges: [dateRange],
      dimensions: [
        { name: "date" },
        { name: "sessionSource" },
        { name: "sessionMedium" },
      ],
      metrics: sourceMetrics.map((name) => ({ name })),
      limit: "50000",
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    });
    for (const r of bySource.rows) {
      const d = isoDate(r.dimensionValues?.[0]?.value ?? "");
      const source = r.dimensionValues?.[1]?.value ?? null;
      const medium = r.dimensionValues?.[2]?.value ?? null;
      r.metricValues?.forEach((m, i) => {
        const canonical = METRIC_MAP[sourceMetrics[i]];
        if (!canonical) return;
        rows.push({
          date: d,
          metric_name: canonical,
          value: Number(m.value ?? 0),
          dimensions: { source, medium },
        });
      });
    }

    return { ok: true, rows };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
