"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@pectus/supabase";
import {
  activateApp,
  deactivateApp,
  setWorkspaceAppConfig,
} from "@/lib/apps";
import {
  parseServiceAccountKey,
  type ServiceAccountKey,
} from "@pectus/google/service-account";
import { testGa4Property } from "@pectus/google/ga4";
import { testSearchConsoleSite } from "@pectus/google/gsc";

// ---------------------------------------------------------------------------
// content-hub
// ---------------------------------------------------------------------------

function parseGithubRepo(input: string): string | null {
  const t = input.trim().replace(/\.git$/u, "").replace(/\/$/u, "");
  const ssh = t.match(/^git@github\.com:([A-Za-z0-9._-]+)\/([A-Za-z0-9._-]+)$/u);
  if (ssh) return `${ssh[1]}/${ssh[2]}`;
  const http = t.match(
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9._-]+)\/([A-Za-z0-9._-]+)$/u,
  );
  if (http) return `${http[1]}/${http[2]}`;
  const raw = t.match(/^([A-Za-z0-9._-]+)\/([A-Za-z0-9._-]+)$/u);
  if (raw) return `${raw[1]}/${raw[2]}`;
  return null;
}

function normalizeMountSlug(siteShape: string, raw: string): string {
  if (siteShape === "greenfield") return "/";
  const t = raw.trim();
  if (!t) return "/";
  let s = t.startsWith("/") ? t : `/${t}`;
  if (!s.endsWith("/")) s = `${s}/`;
  return s;
}

export async function saveContentHubConfig(formData: FormData) {
  const workspaceId = String(formData.get("workspace_id") ?? "").trim();
  const siteShape = String(formData.get("site_shape") ?? "greenfield");
  const mountSlugRaw = String(formData.get("mount_slug") ?? "/");
  const repoRaw = String(formData.get("content_hub_repo") ?? "").trim();

  if (!workspaceId) {
    throw new Error("Pick a workspace before saving Content Hub config.");
  }

  const repo = repoRaw ? parseGithubRepo(repoRaw) : null;
  if (repoRaw && !repo) {
    throw new Error(
      "GitHub repo must look like github.com/owner/repo or owner/repo.",
    );
  }

  const mountSlug = normalizeMountSlug(siteShape, mountSlugRaw);

  await activateApp("content-hub");

  const supabase = await createServerClient();
  await supabase
    .from("workspaces")
    .update({
      mount_slug: mountSlug,
      content_hub_repo: repo,
    })
    .eq("id", workspaceId);

  await setWorkspaceAppConfig(workspaceId, "content-hub", {
    site_shape: siteShape,
    mount_slug: mountSlug,
    content_hub_repo: repo,
  });

  const { data: ws } = await supabase
    .from("workspaces")
    .select("code")
    .eq("id", workspaceId)
    .single();

  revalidatePath("/apps");
  revalidatePath(`/apps/content-hub`);
  revalidatePath(`/workspaces/${ws?.code}/dashboard`);
  redirect(`/workspaces/${ws?.code}/dashboard`);
}

// ---------------------------------------------------------------------------
// Google service account (shared by ga4, gsc, google-ads)
// ---------------------------------------------------------------------------

async function loadIntegration() {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("integrations")
    .select(
      "service_account_json, ga4_property_id, gsc_site_url, account_email, last_verified_at, last_verify_note",
    )
    .eq("provider", "google")
    .maybeSingle();
  return data ?? null;
}

export type ActionState = { ok: boolean; error?: string; message?: string };

export async function saveGoogleServiceAccount(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
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
      provider: "google",
      service_account_json: parsed.key,
      account_email: parsed.key.client_email,
    },
    { onConflict: "provider" },
  );
  if (error) {
    return { ok: false, error: `Save failed: ${error.message}` };
  }
  revalidatePath("/apps/ga4");
  revalidatePath("/apps/gsc");
  revalidatePath("/apps/google-ads");
  return { ok: true, message: `Connected as ${parsed.key.client_email}.` };
}

export async function clearGoogleServiceAccount() {
  const supabase = await createServerClient();
  await supabase
    .from("integrations")
    .update({
      service_account_json: null,
      account_email: null,
      ga4_property_id: null,
      gsc_site_url: null,
      last_verified_at: null,
      last_verify_note: "Cleared from CMS.",
    })
    .eq("provider", "google");
  await deactivateApp("ga4");
  await deactivateApp("gsc");
  revalidatePath("/apps/ga4");
  revalidatePath("/apps/gsc");
  revalidatePath("/apps/google-ads");
  revalidatePath("/apps");
}

// ---------------------------------------------------------------------------
// GA4
// ---------------------------------------------------------------------------

export async function saveGa4(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const propertyId = String(formData.get("ga4_property_id") ?? "").trim();
  if (!/^\d+$/u.test(propertyId)) {
    return {
      ok: false,
      error: "GA4 property ID must be numeric (e.g. 123456789).",
    };
  }

  const integration = await loadIntegration();
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
    .eq("provider", "google");

  await activateApp("ga4");
  revalidatePath("/apps/ga4");
  revalidatePath("/apps");
  return { ok: true, message: "GA4 connected and activated." };
}

export async function testGa4Action(formData: FormData) {
  const propertyId = String(formData.get("ga4_property_id") ?? "").trim();
  if (!/^\d+$/u.test(propertyId)) {
    throw new Error("Enter a numeric GA4 property ID first.");
  }
  const integration = await loadIntegration();
  if (!integration?.service_account_json) {
    throw new Error(
      "Connect a Google service account before testing.",
    );
  }
  const key = integration.service_account_json as ServiceAccountKey;
  const test = await testGa4Property(key, propertyId);
  if (!test.ok) {
    throw new Error(`GA4 test failed: ${test.message}`);
  }
  revalidatePath("/apps/ga4");
}

// ---------------------------------------------------------------------------
// GSC
// ---------------------------------------------------------------------------

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

export async function saveGsc(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let siteUrl: string;
  try {
    siteUrl = validateGscSite(String(formData.get("gsc_site_url") ?? ""));
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const integration = await loadIntegration();
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
    .eq("provider", "google");

  await activateApp("gsc");
  revalidatePath("/apps/gsc");
  revalidatePath("/apps");
  return { ok: true, message: "Search Console connected and activated." };
}

export async function testGscAction(formData: FormData) {
  const siteUrl = validateGscSite(String(formData.get("gsc_site_url") ?? ""));
  const integration = await loadIntegration();
  if (!integration?.service_account_json) {
    throw new Error("Connect a Google service account before testing.");
  }
  const key = integration.service_account_json as ServiceAccountKey;
  const test = await testSearchConsoleSite(key, siteUrl);
  if (!test.ok) {
    throw new Error(`Search Console test failed: ${test.message}`);
  }
  revalidatePath("/apps/gsc");
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

// ---------------------------------------------------------------------------
// Generic deactivate
// ---------------------------------------------------------------------------

export async function deactivateAppAction(formData: FormData) {
  const name = String(formData.get("app_name") ?? "");
  if (!name) return;
  await deactivateApp(name);
  revalidatePath(`/apps/${name}`);
  revalidatePath("/apps");
}
