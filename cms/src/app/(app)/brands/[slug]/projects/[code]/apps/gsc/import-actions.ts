"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@pectus/supabase";
import { requireAdmin } from "@/lib/auth";
import { getBrandBySlug } from "@/lib/active-brand";
import { getProjectByCode } from "@/lib/project";

export type ImportResult =
  | { ok: true; rowCount: number }
  | { ok: false; error: string };

function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

function parseCsv(raw: string): string[][] {
  const text = stripBom(raw);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(field);
        field = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += ch;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

function parseNumber(s: string | undefined): number {
  if (!s) return 0;
  const cleaned = s.replace(/[,\s]/g, "").replace(/%$/, "").trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function parsePercent(s: string | undefined): number {
  const n = parseNumber(s);
  if (s && s.includes("%")) return n / 100;
  return n > 1 ? n / 100 : n;
}

type QueryRow = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

type PageRow = {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

function findColumn(headers: string[], ...candidates: string[]): number {
  const normalized = headers.map((h) => h.trim().toLowerCase());
  for (const c of candidates) {
    const idx = normalized.indexOf(c.toLowerCase());
    if (idx !== -1) return idx;
  }
  for (const c of candidates) {
    const idx = normalized.findIndex((h) => h.includes(c.toLowerCase()));
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseQueriesCsv(text: string): QueryRow[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const header = rows[0];
  const qIdx = findColumn(header, "top queries", "query", "queries");
  const clicksIdx = findColumn(header, "clicks");
  const imprIdx = findColumn(header, "impressions");
  const ctrIdx = findColumn(header, "ctr");
  const posIdx = findColumn(header, "position");
  if (qIdx === -1 || clicksIdx === -1 || imprIdx === -1) {
    throw new Error(
      `Could not find required columns in CSV. Expected "Top queries", "Clicks", "Impressions". Got: ${header.join(", ")}`,
    );
  }
  return rows.slice(1).map((r) => ({
    query: (r[qIdx] ?? "").trim(),
    clicks: parseNumber(r[clicksIdx]),
    impressions: parseNumber(r[imprIdx]),
    ctr: ctrIdx === -1 ? 0 : parsePercent(r[ctrIdx]),
    position: posIdx === -1 ? 0 : parseNumber(r[posIdx]),
  })).filter((r) => r.query.length > 0);
}

function parsePagesCsv(text: string): PageRow[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const header = rows[0];
  const pIdx = findColumn(header, "top pages", "page", "pages", "url");
  const clicksIdx = findColumn(header, "clicks");
  const imprIdx = findColumn(header, "impressions");
  const ctrIdx = findColumn(header, "ctr");
  const posIdx = findColumn(header, "position");
  if (pIdx === -1 || clicksIdx === -1 || imprIdx === -1) {
    throw new Error(
      `Could not find required columns in CSV. Expected "Top pages", "Clicks", "Impressions". Got: ${header.join(", ")}`,
    );
  }
  return rows.slice(1).map((r) => ({
    page: (r[pIdx] ?? "").trim(),
    clicks: parseNumber(r[clicksIdx]),
    impressions: parseNumber(r[imprIdx]),
    ctr: ctrIdx === -1 ? 0 : parsePercent(r[ctrIdx]),
    position: posIdx === -1 ? 0 : parseNumber(r[posIdx]),
  })).filter((r) => r.page.length > 0);
}

const WINDOW_DAYS_DEFAULT = 28;

export async function importGscQueriesCsv(
  formData: FormData,
): Promise<ImportResult> {
  await requireAdmin();
  const slug = String(formData.get("brand_slug") ?? "").trim();
  const code = String(formData.get("project_code") ?? "").trim();
  const file = formData.get("csv");
  if (!slug || !code) return { ok: false, error: "Missing brand or project." };
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No CSV file uploaded." };
  }

  const brand = await getBrandBySlug(slug);
  const project = await getProjectByCode(code);
  const supabase = createServiceClient();

  let rows: QueryRow[];
  try {
    const text = await file.text();
    rows = parseQueriesCsv(text);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
  if (rows.length === 0) {
    return { ok: false, error: "CSV had no query rows." };
  }

  const queries = rows.map((r) => r.query);
  const { data: existing } = await supabase
    .from("keywords")
    .select("keyword, metadata, search_volume, difficulty, intent, cpc, current_rank")
    .eq("project_id", project.id)
    .in("keyword", queries);
  const byKeyword = new Map<string, Record<string, unknown>>();
  for (const row of existing ?? []) {
    byKeyword.set(row.keyword as string, {
      metadata: row.metadata as Record<string, unknown>,
      search_volume: row.search_volume,
      difficulty: row.difficulty,
      intent: row.intent,
      cpc: row.cpc,
      current_rank: row.current_rank,
    });
  }
  const now = new Date().toISOString();
  const upsertRows = rows.map((r) => {
    const ex = byKeyword.get(r.query);
    const prior = (ex?.metadata as Record<string, unknown> | undefined) ?? {};
    return {
      project_id: project.id,
      keyword: r.query,
      search_volume: ex?.search_volume ?? null,
      difficulty: ex?.difficulty ?? null,
      intent: ex?.intent ?? null,
      cpc: ex?.cpc ?? null,
      current_rank: ex?.current_rank ?? null,
      metadata: {
        ...prior,
        gsc_impressions: r.impressions,
        gsc_clicks: r.clicks,
        gsc_position: r.position,
        gsc_ctr: r.ctr,
        gsc_window_days: WINDOW_DAYS_DEFAULT,
        gsc_updated_at: now,
        gsc_source: "csv_import",
      },
    };
  });

  const CHUNK = 500;
  for (let i = 0; i < upsertRows.length; i += CHUNK) {
    const { error } = await supabase
      .from("keywords")
      .upsert(upsertRows.slice(i, i + CHUNK), {
        onConflict: "project_id,keyword",
      });
    if (error) {
      return { ok: false, error: `Keyword upsert failed: ${error.message}` };
    }
  }

  await supabase.from("project_data_freshness").upsert(
    {
      project_id: project.id,
      surface: "gsc",
      last_updated_at: now,
      source: "gsc_csv",
    },
    { onConflict: "project_id,surface" },
  );

  revalidatePath(`/brands/${slug}`, "layout");
  void brand;
  return { ok: true, rowCount: rows.length };
}

export async function importGscPagesCsv(
  formData: FormData,
): Promise<ImportResult> {
  await requireAdmin();
  const slug = String(formData.get("brand_slug") ?? "").trim();
  const code = String(formData.get("project_code") ?? "").trim();
  const file = formData.get("csv");
  if (!slug || !code) return { ok: false, error: "Missing brand or project." };
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No CSV file uploaded." };
  }

  const brand = await getBrandBySlug(slug);
  const project = await getProjectByCode(code);
  const supabase = createServiceClient();

  let rows: PageRow[];
  try {
    const text = await file.text();
    rows = parsePagesCsv(text);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
  if (rows.length === 0) {
    return { ok: false, error: "CSV had no page rows." };
  }

  const now = new Date().toISOString();
  const upsertRows = rows.map((r) => ({
    project_id: project.id,
    page: r.page,
    impressions: r.impressions,
    clicks: r.clicks,
    position: r.position,
    ctr: r.ctr,
    window_days: WINDOW_DAYS_DEFAULT,
    fetched_at: now,
  }));

  const CHUNK = 500;
  for (let i = 0; i < upsertRows.length; i += CHUNK) {
    const { error } = await supabase
      .from("gsc_pages")
      .upsert(upsertRows.slice(i, i + CHUNK), {
        onConflict: "project_id,page",
      });
    if (error) {
      return { ok: false, error: `Pages upsert failed: ${error.message}` };
    }
  }

  await supabase.from("project_data_freshness").upsert(
    {
      project_id: project.id,
      surface: "gsc",
      last_updated_at: now,
      source: "gsc_csv",
    },
    { onConflict: "project_id,surface" },
  );

  revalidatePath(`/brands/${slug}`, "layout");
  void brand;
  return { ok: true, rowCount: rows.length };
}
