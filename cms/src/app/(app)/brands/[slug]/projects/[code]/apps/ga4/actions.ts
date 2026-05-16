"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getBrandBySlug } from "@/lib/active-brand";
import { getProjectByCode } from "@/lib/project";
import { createServiceClient } from "@pectus/supabase";
import type { ServiceAccountKey } from "@pectus/google/service-account";
import { fetchGa4 } from "@pectus/apps/ga4/fetch";

const DEFAULT_LOOKBACK_DAYS = 30;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export type Ga4FetchActionResult = {
  ok: boolean;
  error?: string;
  rowCount?: number;
  range?: { since: string; until: string };
};

export async function runGa4Fetch(
  formData: FormData,
): Promise<Ga4FetchActionResult> {
  await requireUser();
  const slug = String(formData.get("brand_slug") ?? "").trim();
  const code = String(formData.get("project_code") ?? "").trim();
  if (!slug || !code) return { ok: false, error: "Missing brand or project." };

  const brand = await getBrandBySlug(slug);
  const project = await getProjectByCode(code);
  const supabase = createServiceClient();

  const { data: integration } = await supabase
    .from("integrations")
    .select("service_account_json, ga4_property_id")
    .eq("brand_id", brand.id)
    .eq("provider", "google")
    .maybeSingle();
  if (!integration?.service_account_json) {
    return { ok: false, error: "Connect a Google service account first." };
  }
  if (!integration?.ga4_property_id) {
    return { ok: false, error: "Set the GA4 property ID first." };
  }
  const key = integration.service_account_json as ServiceAccountKey;
  const propertyId = integration.ga4_property_id as string;

  const until = isoDate(new Date());
  const since = isoDate(new Date(Date.now() - DEFAULT_LOOKBACK_DAYS * 24 * 3600 * 1000));

  let result;
  try {
    result = await fetchGa4({
      projectId: project.id,
      propertyId,
      key,
      since,
      until,
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const { error: deleteErr } = await supabase
    .from("analytics_metrics")
    .delete()
    .eq("project_id", project.id)
    .eq("source", "ga4")
    .gte("date", since)
    .lte("date", until);
  if (deleteErr) {
    return { ok: false, error: `Clear previous rows failed: ${deleteErr.message}` };
  }

  if (result.rows.length > 0) {
    const insertRows = result.rows.map((r) => ({
      project_id: r.project_id,
      source: "ga4",
      date: r.date,
      metric_name: r.metric_name,
      value: r.value,
      dimensions: r.dimensions,
    }));
    const CHUNK = 500;
    for (let i = 0; i < insertRows.length; i += CHUNK) {
      const slice = insertRows.slice(i, i + CHUNK);
      const { error: insertErr } = await supabase
        .from("analytics_metrics")
        .insert(slice);
      if (insertErr) {
        return { ok: false, error: `Insert failed: ${insertErr.message}` };
      }
    }
  }

  await supabase.from("project_data_freshness").upsert(
    {
      project_id: project.id,
      surface: "ga4",
      last_updated_at: new Date().toISOString(),
      source: "ga4",
    },
    { onConflict: "project_id,surface" },
  );

  revalidatePath(`/brands/${slug}`, "layout");
  return {
    ok: true,
    rowCount: result.row_count,
    range: result.range,
  };
}
