"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getProjectByCode, touchFreshness } from "@/lib/project";
import * as XLSX from "xlsx";

export type ImportResult = {
  ok: boolean;
  imported: number;
  skipped: number;
  error?: string;
};

function toInt(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number.parseInt(v.replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

function toFloat(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number.parseFloat(v.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const tabs = (firstLine.match(/\t/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  return tabs > commas ? "\t" : ",";
}

function parseDelimited(text: string, delim: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const lines: string[][] = [];
  let cur: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delim) {
      cur.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      cur.push(cell);
      lines.push(cur);
      cur = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell.length > 0 || cur.length > 0) {
    cur.push(cell);
    lines.push(cur);
  }

  const [headerRow, ...dataRows] = lines.filter(
    (l) => l.length > 0 && l.some((c) => c !== ""),
  );
  const headers = (headerRow ?? []).map((h) => h.trim());
  const rows = dataRows.map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (row[idx] ?? "").trim();
    });
    return obj;
  });
  return { headers, rows };
}

function parseXlsx(buf: ArrayBuffer): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const wb = XLSX.read(buf, { type: "array" });
  const firstSheet = wb.SheetNames[0];
  if (!firstSheet) return { headers: [], rows: [] };
  const sheet = wb.Sheets[firstSheet];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });
  if (json.length === 0) return { headers: [], rows: [] };
  const headers = Object.keys(json[0]).map((h) => String(h).trim());
  const rows = json.map((r) => {
    const obj: Record<string, string> = {};
    for (const h of headers) {
      const v = r[h];
      obj[h] = v === null || v === undefined ? "" : String(v).trim();
    }
    return obj;
  });
  return { headers, rows };
}

function inferColumn(headers: string[], targets: RegExp[]): string | undefined {
  for (const h of headers) {
    const norm = h.toLowerCase();
    if (targets.some((re) => re.test(norm))) return h;
  }
  return undefined;
}

async function readSource(formData: FormData): Promise<
  | { ok: true; headers: string[]; rows: Record<string, string>[]; sourceName: string }
  | { ok: false; error: string }
> {
  const file = formData.get("file");
  const pasted = String(formData.get("pasted") ?? "").trim();

  if (file instanceof File && file.size > 0) {
    const name = file.name.toLowerCase();
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      const buf = await file.arrayBuffer();
      const parsed = parseXlsx(buf);
      if (parsed.headers.length === 0) {
        return { ok: false, error: "Spreadsheet has no rows on the first sheet." };
      }
      return { ok: true, ...parsed, sourceName: file.name };
    }
    const text = await file.text();
    const delim = name.endsWith(".tsv") ? "\t" : detectDelimiter(text);
    const parsed = parseDelimited(text, delim);
    if (parsed.headers.length === 0) {
      return { ok: false, error: "File parsed to zero rows." };
    }
    return { ok: true, ...parsed, sourceName: file.name };
  }

  if (pasted) {
    const delim = detectDelimiter(pasted);
    const parsed = parseDelimited(pasted, delim);
    if (parsed.headers.length === 0) {
      return { ok: false, error: "Pasted text parsed to zero rows." };
    }
    return { ok: true, ...parsed, sourceName: "pasted" };
  }

  return {
    ok: false,
    error: "Pick a file or paste rows in the textarea, then click Import.",
  };
}

export async function importKeywords(
  _prev: ImportResult | null,
  formData: FormData,
): Promise<ImportResult> {
  const code = String(formData.get("code") ?? "");

  const source = await readSource(formData);
  if (!source.ok) {
    return { ok: false, imported: 0, skipped: 0, error: source.error };
  }

  const { headers, rows, sourceName } = source;
  if (rows.length === 0) {
    return { ok: false, imported: 0, skipped: 0, error: "No data rows." };
  }

  const keywordCol = inferColumn(headers, [/^keyword/, /^query/, /^search\s*term/]);
  if (!keywordCol) {
    return {
      ok: false,
      imported: 0,
      skipped: 0,
      error: `Couldn't find a 'keyword' column. Headers seen: ${headers.join(", ")}`,
    };
  }

  const volumeCol = inferColumn(headers, [/volume/, /searches/]);
  const difficultyCol = inferColumn(headers, [/difficulty|kd/]);
  const intentCol = inferColumn(headers, [/intent/]);
  const cpcCol = inferColumn(headers, [/cpc/]);
  const rankCol = inferColumn(headers, [/position|rank/]);

  const { supabase } = await requireUser();
  const project = await getProjectByCode(code);

  const payload: Array<Record<string, unknown>> = [];
  let skipped = 0;

  for (const row of rows) {
    const keyword = row[keywordCol]?.trim();
    if (!keyword) {
      skipped += 1;
      continue;
    }
    const metadata: Record<string, string> = {};
    for (const [h, v] of Object.entries(row)) {
      if (
        h !== keywordCol &&
        h !== volumeCol &&
        h !== difficultyCol &&
        h !== intentCol &&
        h !== cpcCol &&
        h !== rankCol &&
        v
      ) {
        metadata[h] = v;
      }
    }
    payload.push({
      project_id: project.id,
      keyword: keyword.toLowerCase(),
      search_volume: volumeCol ? toInt(row[volumeCol]) : null,
      difficulty: difficultyCol ? toFloat(row[difficultyCol]) : null,
      intent: intentCol ? row[intentCol]?.trim().toLowerCase() || null : null,
      cpc: cpcCol ? toFloat(row[cpcCol]) : null,
      current_rank: rankCol ? toInt(row[rankCol]) : null,
      metadata,
      imported_at: new Date().toISOString(),
    });
  }

  if (payload.length === 0) {
    return {
      ok: false,
      imported: 0,
      skipped,
      error: "Every row was missing a keyword.",
    };
  }

  const chunkSize = 500;
  for (let i = 0; i < payload.length; i += chunkSize) {
    const chunk = payload.slice(i, i + chunkSize);
    const { error } = await supabase
      .from("keywords")
      .upsert(chunk, { onConflict: "project_id,keyword" });
    if (error) {
      return { ok: false, imported: i, skipped, error: error.message };
    }
  }

  await touchFreshness(project.id, "keywords", `import:${sourceName}`);
  revalidatePath(`/projects/${code}/keywords`);
  revalidatePath(`/projects/${code}`);
  revalidatePath("/projects");

  return { ok: true, imported: payload.length, skipped };
}

/* GSC sync. Pulls stored Google service-account credentials from the brand's
 * `integrations` row and calls the Pectus GSC connector. */
export type GscSyncResult =
  | { ok: true; imported: number; skipped: number }
  | { ok: false; error: string };

export async function syncFromGsc(code: string): Promise<GscSyncResult> {
  const { supabase } = await requireUser();
  const project = await getProjectByCode(code);

  const { data: brandRow } = await supabase
    .from("projects")
    .select("brand_id")
    .eq("id", project.id)
    .maybeSingle();
  const brandId = brandRow?.brand_id as string | undefined;
  if (!brandId) {
    return { ok: false, error: "Project has no brand. Cannot read integrations." };
  }

  const { data: integration } = await supabase
    .from("integrations")
    .select("service_account_json, gsc_site_url")
    .eq("brand_id", brandId)
    .eq("provider", "google")
    .maybeSingle();

  if (!integration?.service_account_json) {
    return {
      ok: false,
      error:
        "Google service account isn't saved yet. Connect Google under brand Settings.",
    };
  }
  if (!integration.gsc_site_url) {
    return {
      ok: false,
      error:
        "Search Console site URL isn't saved yet. Set it under brand Settings → Google.",
    };
  }

  let fetchGscQueryRows: typeof import("@pectus/google/gsc").fetchGscQueryRows;
  try {
    ({ fetchGscQueryRows } = await import("@pectus/google/gsc"));
  } catch {
    return {
      ok: false,
      error: "GSC connector not available in this install.",
    };
  }

  const pathFilter = `/${project.code}/`;
  const result = await fetchGscQueryRows(
    integration.service_account_json as Parameters<typeof fetchGscQueryRows>[0],
    integration.gsc_site_url,
    pathFilter,
    90,
  );
  if (!result.ok) return { ok: false, error: result.error };

  const seen = new Set<string>();
  const payload: Array<Record<string, unknown>> = [];
  let skipped = 0;
  for (const r of result.rows) {
    const kw = (r.query ?? "").trim().toLowerCase();
    if (!kw || kw.length > 200 || seen.has(kw)) {
      skipped += 1;
      continue;
    }
    seen.add(kw);
    payload.push({
      project_id: project.id,
      keyword: kw,
      search_volume: r.impressions ?? null,
      current_rank: r.position ? Math.round(r.position) : null,
      metadata: {
        gsc_impressions: r.impressions ?? 0,
        gsc_clicks: r.clicks ?? 0,
        gsc_ctr: r.ctr ?? 0,
        gsc_position: r.position ?? 0,
      },
      imported_at: new Date().toISOString(),
    });
  }

  if (payload.length === 0) {
    return { ok: false, error: "GSC returned no rows for this project." };
  }

  const chunkSize = 500;
  for (let i = 0; i < payload.length; i += chunkSize) {
    const { error } = await supabase
      .from("keywords")
      .upsert(payload.slice(i, i + chunkSize), {
        onConflict: "project_id,keyword",
      });
    if (error) return { ok: false, error: error.message };
  }

  await touchFreshness(project.id, "keywords", "gsc");
  revalidatePath(`/projects/${code}/keywords`);
  revalidatePath(`/projects/${code}`);

  return { ok: true, imported: payload.length, skipped };
}

export async function clearKeywords(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const { supabase } = await requireUser();
  const project = await getProjectByCode(code);

  await supabase.from("keywords").delete().eq("project_id", project.id);
  await supabase
    .from("project_data_freshness")
    .delete()
    .eq("project_id", project.id)
    .eq("surface", "keywords");

  revalidatePath(`/projects/${code}`);
  revalidatePath(`/projects/${code}/keywords`);
  revalidatePath("/projects");
}
