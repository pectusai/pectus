"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@pectus/supabase";
import { requireUser } from "@/lib/auth";
import { getBrandBySlug } from "@/lib/active-brand";
import {
  parseServiceAccountKey,
  type ServiceAccountKey,
} from "@pectus/google/service-account";
import { testGa4Property } from "@pectus/google/ga4";
import { testSearchConsoleSite } from "@pectus/google/gsc";

export type ActionState = { ok: boolean; error?: string; message?: string };

async function loadIntegration(brandId: string) {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("integrations")
    .select(
      "service_account_json, ga4_property_id, gsc_site_url, account_email, last_verified_at, last_verify_note",
    )
    .eq("brand_id", brandId)
    .eq("provider", "google")
    .maybeSingle();
  return data ?? null;
}

export async function saveGoogleServiceAccount(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();
  const slug = String(formData.get("brand_slug") ?? "");
  if (!slug) return { ok: false, error: "Missing brand." };
  const brand = await getBrandBySlug(slug);

  const file = formData.get("service_account_file");
  const pasted = String(formData.get("service_account_json") ?? "");
  let raw = pasted;
  if (file && typeof file === "object" && "size" in file && (file as File).size > 0) {
    raw = await (file as File).text();
  }
  if (!raw.trim()) {
    return {
      ok: false,
      error: "Upload the service account JSON file or paste its contents.",
    };
  }
  const parsed = parseServiceAccountKey(raw);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }
  const supabase = await createServerClient();
  const { error } = await supabase.from("integrations").upsert(
    {
      brand_id: brand.id,
      provider: "google",
      service_account_json: parsed.key,
      account_email: parsed.key.client_email,
    },
    { onConflict: "brand_id,provider" },
  );
  if (error) {
    return { ok: false, error: `Save failed: ${error.message}` };
  }
  revalidatePath(`/brands/${slug}/settings/integrations/google`);
  return { ok: true, message: `Connected as ${parsed.key.client_email}.` };
}

export async function clearGoogleServiceAccount(formData: FormData) {
  await requireUser();
  const slug = String(formData.get("brand_slug") ?? "");
  if (!slug) return;
  const brand = await getBrandBySlug(slug);
  const supabase = await createServerClient();
  await supabase
    .from("integrations")
    .update({
      service_account_json: null,
      account_email: null,
      ga4_property_id: null,
      gsc_site_url: null,
      last_verified_at: null,
      last_verify_note: "Cleared from Settings.",
    })
    .eq("brand_id", brand.id)
    .eq("provider", "google");
  revalidatePath(`/brands/${slug}/settings/integrations/google`);
}

export async function saveGa4(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();
  const slug = String(formData.get("brand_slug") ?? "");
  if (!slug) return { ok: false, error: "Missing brand." };
  const brand = await getBrandBySlug(slug);

  const propertyId = String(formData.get("ga4_property_id") ?? "").trim();
  if (!/^\d+$/u.test(propertyId)) {
    return {
      ok: false,
      error: "GA4 property ID must be numeric (e.g. 123456789).",
    };
  }

  const integration = await loadIntegration(brand.id);
  if (!integration?.service_account_json) {
    return {
      ok: false,
      error:
        "Connect a Google service account first (panel above), then come back.",
    };
  }

  const key = integration.service_account_json as ServiceAccountKey;
  const test = await testGa4Property(key, propertyId);
  if (!test.ok) {
    return { ok: false, error: humanizeGoogleError("GA4", test.message, key) };
  }

  const supabase = await createServerClient();
  await supabase
    .from("integrations")
    .update({
      ga4_property_id: propertyId,
      last_verified_at: new Date().toISOString(),
      last_verify_note: "GA4 OK",
    })
    .eq("brand_id", brand.id)
    .eq("provider", "google");

  revalidatePath(`/brands/${slug}/settings/integrations/google`);
  return { ok: true, message: "GA4 property saved and verified." };
}

export async function saveGsc(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();
  const slug = String(formData.get("brand_slug") ?? "");
  if (!slug) return { ok: false, error: "Missing brand." };
  const brand = await getBrandBySlug(slug);

  let siteUrl: string;
  try {
    siteUrl = validateGscSite(String(formData.get("gsc_site_url") ?? ""));
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const integration = await loadIntegration(brand.id);
  if (!integration?.service_account_json) {
    return {
      ok: false,
      error:
        "Connect a Google service account first (panel above), then come back.",
    };
  }

  const key = integration.service_account_json as ServiceAccountKey;
  const test = await testSearchConsoleSite(key, siteUrl);
  if (!test.ok) {
    return {
      ok: false,
      error: humanizeGoogleError("Search Console", test.message, key),
    };
  }

  const supabase = await createServerClient();
  await supabase
    .from("integrations")
    .update({
      gsc_site_url: siteUrl,
      last_verified_at: new Date().toISOString(),
      last_verify_note: "GSC OK",
    })
    .eq("brand_id", brand.id)
    .eq("provider", "google");

  revalidatePath(`/brands/${slug}/settings/integrations/google`);
  return { ok: true, message: "Search Console site saved and verified." };
}

function validateGscSite(raw: string): string {
  const t = raw.trim();
  if (t.startsWith("sc-domain:")) return t;
  try {
    new URL(t);
    return t;
  } catch {
    throw new Error(
      "Site must be https://example.com/ or sc-domain:example.com.",
    );
  }
}

function humanizeGoogleError(
  api: string,
  rawMessage: string,
  key: ServiceAccountKey,
): string {
  const email = key.client_email;
  if (/PERMISSION_DENIED|sufficient permissions|403/i.test(rawMessage)) {
    if (api === "GA4") {
      return `Google says the service account does not have access to this GA4 property. Open GA4 → Admin → Property access management → click the blue +, paste the service account email (${email}), role = Viewer, save. Then try again. Raw error: ${rawMessage.slice(0, 300)}`;
    }
    return `Google says the service account does not have access to this Search Console site. Open Search Console → Settings → Users and permissions → Add user, paste the service account email (${email}), permission = Restricted (or Full), save. Then try again. Raw error: ${rawMessage.slice(0, 300)}`;
  }
  if (/SERVICE_DISABLED|API.*not enabled/i.test(rawMessage)) {
    return `The Google API for ${api} is not enabled in your Google Cloud project. Open Google Cloud Console → APIs & Services → Library, search for the ${api} API, and click Enable. Wait ~30 seconds for propagation. Raw error: ${rawMessage.slice(0, 300)}`;
  }
  if (/INVALID_ARGUMENT|invalid_grant|400/i.test(rawMessage)) {
    return `${api} rejected the request as invalid. Most often this means a typo in the property ID or site URL. Double-check what you pasted. Raw error: ${rawMessage.slice(0, 300)}`;
  }
  return `${api} test failed: ${rawMessage}`;
}
