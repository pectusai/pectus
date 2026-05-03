import { type ServiceAccountKey, getAccessToken } from "./service-account";

export type Ga4LandingPageRow = {
  landingPage: string;
  sessions: number;
  leads: number;
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
