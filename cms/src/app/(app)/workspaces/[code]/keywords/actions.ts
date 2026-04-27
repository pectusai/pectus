"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getWorkspaceByCode, touchFreshness } from "@/lib/workspace";

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

/* Minimal CSV parser. Handles quoted values, doubled quotes, and ,/\n line
 * endings. The full Papa-parse experience comes back when the LLM-assisted
 * column mapper is wired up in a later PR. */
function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
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
    } else if (ch === ",") {
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

  const [headerRow, ...dataRows] = lines.filter((l) => l.length > 0 && l.some((c) => c !== ""));
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

/* Heuristic column mapping: lower-case the header, match against known SEO
 * tool names. Good enough for plumbing; the Claude-powered mapper from the
 * source repo can come back via a skill later. */
function inferColumn(headers: string[], targets: RegExp[]): string | undefined {
  for (const h of headers) {
    const norm = h.toLowerCase();
    if (targets.some((re) => re.test(norm))) return h;
  }
  return undefined;
}

export async function importKeywordsCsv(
  _prev: ImportResult | null,
  formData: FormData,
): Promise<ImportResult> {
  const code = String(formData.get("code") ?? "");
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, imported: 0, skipped: 0, error: "Pick a CSV file first." };
  }

  const text = await file.text();
  const { headers, rows } = parseCsv(text);

  if (rows.length === 0) {
    return { ok: false, imported: 0, skipped: 0, error: "CSV had no data rows." };
  }

  const keywordCol = inferColumn(headers, [/^keyword/, /^query/, /^search\s*term/]);
  if (!keywordCol) {
    return {
      ok: false,
      imported: 0,
      skipped: 0,
      error: `Couldn't find a 'keyword' column. Headers: ${headers.join(", ")}`,
    };
  }

  const volumeCol = inferColumn(headers, [/volume/, /searches/]);
  const difficultyCol = inferColumn(headers, [/difficulty|kd/]);
  const intentCol = inferColumn(headers, [/intent/]);
  const cpcCol = inferColumn(headers, [/cpc/]);
  const rankCol = inferColumn(headers, [/position|rank/]);

  const { supabase } = await requireUser();
  const workspace = await getWorkspaceByCode(code);

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
      workspace_id: workspace.id,
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
      .upsert(chunk, { onConflict: "workspace_id,keyword" });
    if (error) {
      return { ok: false, imported: i, skipped, error: error.message };
    }
  }

  await touchFreshness(workspace.id, "keywords", `csv:${file.name}`);
  revalidatePath(`/workspaces/${code}/keywords`);
  revalidatePath(`/workspaces/${code}`);
  revalidatePath("/workspaces");

  return { ok: true, imported: payload.length, skipped };
}

/* GSC sync. Pulls stored Google service-account credentials from the
 * `integrations` table and calls the Pectus GSC connector. Fails fast and
 * loud if the integration isn't configured — wiring up GSC happens on
 * /brand. */
export type GscSyncResult =
  | { ok: true; imported: number; skipped: number }
  | { ok: false; error: string };

export async function syncFromGsc(code: string): Promise<GscSyncResult> {
  const { supabase } = await requireUser();
  const workspace = await getWorkspaceByCode(code);

  const { data: integration } = await supabase
    .from("integrations")
    .select("service_account_json, gsc_site_url")
    .eq("provider", "google")
    .maybeSingle();

  if (!integration?.service_account_json) {
    return {
      ok: false,
      error:
        "Google service account isn't saved yet. Connect Google on /brand first.",
    };
  }
  if (!integration.gsc_site_url) {
    return {
      ok: false,
      error: "Search Console site URL isn't saved yet. Set it on /brand.",
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

  const pathFilter = `/${workspace.code}/`;
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
      workspace_id: workspace.id,
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
    return { ok: false, error: "GSC returned no rows for this workspace." };
  }

  const chunkSize = 500;
  for (let i = 0; i < payload.length; i += chunkSize) {
    const { error } = await supabase
      .from("keywords")
      .upsert(payload.slice(i, i + chunkSize), {
        onConflict: "workspace_id,keyword",
      });
    if (error) return { ok: false, error: error.message };
  }

  await touchFreshness(workspace.id, "keywords", "gsc");
  revalidatePath(`/workspaces/${code}/keywords`);
  revalidatePath(`/workspaces/${code}`);

  return { ok: true, imported: payload.length, skipped };
}

export async function clearKeywords(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const { supabase } = await requireUser();
  const workspace = await getWorkspaceByCode(code);

  await supabase.from("keywords").delete().eq("workspace_id", workspace.id);
  await supabase
    .from("workspace_data_freshness")
    .delete()
    .eq("workspace_id", workspace.id)
    .eq("surface", "keywords");

  revalidatePath(`/workspaces/${code}`);
  revalidatePath(`/workspaces/${code}/keywords`);
  revalidatePath("/workspaces");
}
