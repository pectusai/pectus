import { type ServiceAccountKey, getAccessToken } from "./service-account";

export type GscQueryRow = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type GscPageRow = {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type GscDailyRowRaw = {
  date: string;
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  position: number;
};

export async function fetchGscQueryRows(
  key: ServiceAccountKey,
  siteUrl: string,
  pathContains: string,
  daysBack: number,
): Promise<{ ok: true; rows: GscQueryRow[] } | { ok: false; error: string }> {
  return queryGsc<GscQueryRow>(key, siteUrl, pathContains, daysBack, "query", (r, k) => ({
    query: k,
    clicks: Math.round(r.clicks ?? 0),
    impressions: Math.round(r.impressions ?? 0),
    ctr: r.ctr ?? 0,
    position: r.position ?? 0,
  }));
}

export async function fetchGscPageRows(
  key: ServiceAccountKey,
  siteUrl: string,
  pathContains: string,
  daysBack: number,
): Promise<{ ok: true; rows: GscPageRow[] } | { ok: false; error: string }> {
  return queryGsc<GscPageRow>(key, siteUrl, pathContains, daysBack, "page", (r, k) => ({
    page: k,
    clicks: Math.round(r.clicks ?? 0),
    impressions: Math.round(r.impressions ?? 0),
    ctr: r.ctr ?? 0,
    position: r.position ?? 0,
  }));
}

export async function testSearchConsoleSite(
  key: ServiceAccountKey,
  siteUrl: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    const token = await getAccessToken(key, [
      "https://www.googleapis.com/auth/webmasters.readonly",
    ]);
    const encoded = encodeURIComponent(siteUrl);
    const res = await fetch(
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${encoded}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, message: `GSC failed (${res.status}): ${body.slice(0, 400)}` };
    }
    return { ok: true, message: "Search Console responded ok." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}

export async function fetchGscDailyByQueryPage(
  key: ServiceAccountKey,
  siteUrl: string,
  startDate: string,
  endDate: string,
): Promise<
  { ok: true; rows: GscDailyRowRaw[] } | { ok: false; error: string }
> {
  try {
    const token = await getAccessToken(key, [
      "https://www.googleapis.com/auth/webmasters.readonly",
    ]);
    const encoded = encodeURIComponent(siteUrl);
    const pageSize = 25000;
    const maxPages = 10;
    const all: GscDailyRowRaw[] = [];

    for (let p = 0; p < maxPages; p += 1) {
      const body = {
        startDate,
        endDate,
        dimensions: ["date", "query", "page"],
        rowLimit: pageSize,
        startRow: p * pageSize,
      };
      const res = await fetch(
        `https://searchconsole.googleapis.com/webmasters/v3/sites/${encoded}/searchAnalytics/query`,
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
        return {
          ok: false,
          error: `GSC daily failed (${res.status}): ${text.slice(0, 400)}`,
        };
      }
      const json = (await res.json()) as { rows?: GscRawRow[] };
      const rows = json.rows ?? [];
      for (const r of rows) {
        const d = r.keys?.[0];
        const q = r.keys?.[1];
        const pg = r.keys?.[2];
        if (!d || !q || !pg) continue;
        all.push({
          date: d,
          query: q,
          page: pg,
          clicks: Math.round(r.clicks ?? 0),
          impressions: Math.round(r.impressions ?? 0),
          position: r.position ?? 0,
        });
      }
      if (rows.length < pageSize) break;
    }
    return { ok: true, rows: all };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

type GscRawRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

async function queryGsc<T>(
  key: ServiceAccountKey,
  siteUrl: string,
  pathContains: string,
  daysBack: number,
  dimension: "query" | "page",
  shape: (row: GscRawRow, dimensionValue: string) => T,
): Promise<{ ok: true; rows: T[] } | { ok: false; error: string }> {
  try {
    const token = await getAccessToken(key, [
      "https://www.googleapis.com/auth/webmasters.readonly",
    ]);
    const endDate = new Date();
    const startDate = new Date(Date.now() - daysBack * 24 * 3600 * 1000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    const all: T[] = [];
    const pageSize = 5000;
    const maxPages = 4;
    const encoded = encodeURIComponent(siteUrl);

    for (let page = 0; page < maxPages; page += 1) {
      const body = {
        startDate: fmt(startDate),
        endDate: fmt(endDate),
        dimensions: [dimension],
        dimensionFilterGroups: pathContains
          ? [
              {
                filters: [
                  { dimension: "page", operator: "contains", expression: pathContains },
                ],
              },
            ]
          : undefined,
        rowLimit: pageSize,
        startRow: page * pageSize,
      };

      const res = await fetch(
        `https://searchconsole.googleapis.com/webmasters/v3/sites/${encoded}/searchAnalytics/query`,
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
        return {
          ok: false,
          error: `GSC failed (${res.status}): ${text.slice(0, 400)}`,
        };
      }

      const json = (await res.json()) as { rows?: GscRawRow[] };
      const rows = json.rows ?? [];
      for (const r of rows) {
        const k = r.keys?.[0];
        if (!k) continue;
        all.push(shape(r, k));
      }
      if (rows.length < pageSize) break;
    }

    return { ok: true, rows: all };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
