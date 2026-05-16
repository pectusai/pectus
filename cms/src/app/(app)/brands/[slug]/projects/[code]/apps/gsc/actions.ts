"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getBrandBySlug } from "@/lib/active-brand";
import { getProjectByCode } from "@/lib/project";
import { createServiceClient } from "@pectus/supabase";
import type { ServiceAccountKey } from "@pectus/google/service-account";
import { fetchGsc } from "@pectus/apps/gsc/fetch";

const DAILY_LOOKBACK_DAYS = 7;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export type GscFetchActionResult = {
  ok: boolean;
  error?: string;
  keywordRowCount?: number;
  dailyRowCount?: number;
};

export async function runGscFetch(
  formData: FormData,
): Promise<GscFetchActionResult> {
  await requireUser();
  const slug = String(formData.get("brand_slug") ?? "").trim();
  const code = String(formData.get("project_code") ?? "").trim();
  if (!slug || !code) return { ok: false, error: "Missing brand or project." };

  const brand = await getBrandBySlug(slug);
  const project = await getProjectByCode(code);
  const supabase = createServiceClient();

  const { data: integration } = await supabase
    .from("integrations")
    .select("service_account_json, gsc_site_url")
    .eq("brand_id", brand.id)
    .eq("provider", "google")
    .maybeSingle();
  if (!integration?.service_account_json) {
    return { ok: false, error: "Connect a Google service account first." };
  }
  if (!integration?.gsc_site_url) {
    return { ok: false, error: "Set the Search Console site first." };
  }
  const key = integration.service_account_json as ServiceAccountKey;
  const siteUrl = integration.gsc_site_url as string;

  let result;
  try {
    result = await fetchGsc({
      projectId: project.id,
      siteUrl,
      key,
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  if (result.keyword_rows.length > 0) {
    const queries = result.keyword_rows.map((r) => r.query);
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
    const upsertRows = result.keyword_rows.map((r) => {
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
          gsc_window_days: r.window_days,
          gsc_updated_at: result.fetched_at,
        },
      };
    });
    const CHUNK = 500;
    for (let i = 0; i < upsertRows.length; i += CHUNK) {
      const slice = upsertRows.slice(i, i + CHUNK);
      const { error: upsertErr } = await supabase
        .from("keywords")
        .upsert(slice, { onConflict: "project_id,keyword" });
      if (upsertErr) {
        return { ok: false, error: `Keyword upsert failed: ${upsertErr.message}` };
      }
    }
  }

  if (result.gsc_daily_rows.length > 0) {
    const dailyUntil = isoDate(new Date());
    const dailySince = isoDate(
      new Date(Date.now() - DAILY_LOOKBACK_DAYS * 24 * 3600 * 1000),
    );
    const { error: deleteErr } = await supabase
      .from("gsc_daily")
      .delete()
      .eq("project_id", project.id)
      .gte("date", dailySince)
      .lte("date", dailyUntil);
    if (deleteErr) {
      return { ok: false, error: `Clear previous daily rows failed: ${deleteErr.message}` };
    }

    const insertRows = result.gsc_daily_rows.map((r) => ({
      project_id: r.project_id,
      date: r.date,
      query: r.query,
      page: r.page,
      impressions: r.impressions,
      clicks: r.clicks,
      position: r.position,
    }));
    const CHUNK = 500;
    for (let i = 0; i < insertRows.length; i += CHUNK) {
      const slice = insertRows.slice(i, i + CHUNK);
      const { error: insertErr } = await supabase
        .from("gsc_daily")
        .insert(slice);
      if (insertErr) {
        return { ok: false, error: `Daily insert failed: ${insertErr.message}` };
      }
    }
  }

  await supabase.from("project_data_freshness").upsert(
    {
      project_id: project.id,
      surface: "gsc",
      last_updated_at: new Date().toISOString(),
      source: "gsc",
    },
    { onConflict: "project_id,surface" },
  );

  revalidatePath(`/brands/${slug}`, "layout");
  return {
    ok: true,
    keywordRowCount: result.keyword_row_count,
    dailyRowCount: result.daily_row_count,
  };
}
