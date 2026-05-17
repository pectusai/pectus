import { createServiceClient } from "@pectus/supabase";

type Supabase = ReturnType<typeof createServiceClient>;

export type GscQueryMover = {
  query: string;
  direction: "up" | "down";
  impressions_this: number;
  impressions_prior: number;
  impressions_delta: number;
  position_this: number | null;
  position_prior: number | null;
  position_delta: number | null;
};

export type GscDailyGather = {
  movers: GscQueryMover[];
  hasAnyData: boolean;
  windowSince: string;
  windowUntil: string;
};

const WINDOW_DAYS = 14;
const TOP_RISERS = 8;
const TOP_DECLINERS = 8;
const MIN_IMPRESSIONS_THIS = 5;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

type Row = {
  date: string;
  query: string;
  impressions: number;
  clicks: number;
  position: number;
};

export async function gatherGscDaily(
  supabase: Supabase,
  projectId: string,
): Promise<GscDailyGather> {
  const until = isoDate(new Date());
  const since = isoDate(new Date(Date.now() - WINDOW_DAYS * 24 * 3600 * 1000));

  const { data, error } = await supabase
    .from("gsc_daily")
    .select("date, query, impressions, clicks, position")
    .eq("project_id", projectId)
    .gte("date", since)
    .lte("date", until);
  if (error) throw new Error(`GSC daily read failed: ${error.message}`);

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) {
    return { movers: [], hasAnyData: false, windowSince: since, windowUntil: until };
  }

  const midpoint = isoDate(new Date(Date.now() - 7 * 24 * 3600 * 1000));

  type Bucket = { impressions: number; positionWeighted: number; weight: number };
  const blank = (): Bucket => ({ impressions: 0, positionWeighted: 0, weight: 0 });
  const thisWeek = new Map<string, Bucket>();
  const priorWeek = new Map<string, Bucket>();
  for (const r of rows) {
    const target = r.date >= midpoint ? thisWeek : priorWeek;
    if (!target.has(r.query)) target.set(r.query, blank());
    const b = target.get(r.query)!;
    b.impressions += r.impressions;
    b.positionWeighted += (r.position ?? 0) * (r.impressions || 1);
    b.weight += r.impressions || 1;
  }

  const queries = new Set<string>([...thisWeek.keys(), ...priorWeek.keys()]);
  const movers: GscQueryMover[] = [];
  for (const query of queries) {
    const t = thisWeek.get(query) ?? blank();
    const p = priorWeek.get(query) ?? blank();
    if (t.impressions < MIN_IMPRESSIONS_THIS && p.impressions < MIN_IMPRESSIONS_THIS) continue;
    const delta = t.impressions - p.impressions;
    if (delta === 0) continue;
    const posThis = t.weight > 0 ? t.positionWeighted / t.weight : null;
    const posPrior = p.weight > 0 ? p.positionWeighted / p.weight : null;
    const posDelta =
      posThis != null && posPrior != null ? posThis - posPrior : null;
    movers.push({
      query,
      direction: delta > 0 ? "up" : "down",
      impressions_this: t.impressions,
      impressions_prior: p.impressions,
      impressions_delta: delta,
      position_this: posThis,
      position_prior: posPrior,
      position_delta: posDelta,
    });
  }

  const risers = movers
    .filter((m) => m.direction === "up")
    .sort((a, b) => b.impressions_delta - a.impressions_delta)
    .slice(0, TOP_RISERS);
  const decliners = movers
    .filter((m) => m.direction === "down")
    .sort((a, b) => a.impressions_delta - b.impressions_delta)
    .slice(0, TOP_DECLINERS);

  return {
    movers: [...risers, ...decliners],
    hasAnyData: true,
    windowSince: since,
    windowUntil: until,
  };
}

export function formatGscDailyForPrompt(g: GscDailyGather): string {
  if (!g.hasAnyData) {
    return `GSC LAST 14 DAYS — week-over-week query deltas (${g.windowSince} → ${g.windowUntil})
(no daily data in window)`;
  }
  const risers = g.movers.filter((m) => m.direction === "up");
  const decliners = g.movers.filter((m) => m.direction === "down");
  const fmt = (m: GscQueryMover) => {
    const pos =
      m.position_this != null && m.position_prior != null
        ? `pos ${m.position_prior.toFixed(1)} → ${m.position_this.toFixed(1)}`
        : "pos —";
    return `"${m.query}" · impr ${m.impressions_prior} → ${m.impressions_this} (${m.impressions_delta > 0 ? "+" : ""}${m.impressions_delta}) · ${pos}`;
  };
  return `GSC LAST 14 DAYS — week-over-week query deltas (${g.windowSince} → ${g.windowUntil})
RISING (impressions up week-over-week)
${risers.length ? risers.map(fmt).join("\n") : "(none)"}

DECLINING (impressions down)
${decliners.length ? decliners.map(fmt).join("\n") : "(none)"}`;
}
