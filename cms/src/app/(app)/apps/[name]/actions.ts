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

export async function saveGoogleServiceAccount(formData: FormData) {
  const file = formData.get("service_account_file");
  const pasted = String(formData.get("service_account_json") ?? "");
  let raw = pasted;
  if (file && typeof file === "object" && "size" in file && (file as File).size > 0) {
    raw = await (file as File).text();
  }
  if (!raw.trim()) {
    throw new Error("Upload the service account JSON file or paste its contents.");
  }
  const parsed = parseServiceAccountKey(raw);
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }
  const supabase = await createServerClient();
  await supabase.from("integrations").upsert(
    {
      provider: "google",
      service_account_json: parsed.key,
      account_email: parsed.key.client_email,
    },
    { onConflict: "provider" },
  );
  revalidatePath("/apps/ga4");
  revalidatePath("/apps/gsc");
  revalidatePath("/apps/google-ads");
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

export async function saveGa4(formData: FormData) {
  const propertyId = String(formData.get("ga4_property_id") ?? "").trim();
  if (!/^\d+$/u.test(propertyId)) {
    throw new Error("GA4 property ID must be numeric (e.g. 123456789).");
  }

  const integration = await loadIntegration();
  if (!integration?.service_account_json) {
    throw new Error(
      "Connect a Google service account before saving a GA4 property.",
    );
  }

  const key = integration.service_account_json as ServiceAccountKey;
  const test = await testGa4Property(key, propertyId);
  if (!test.ok) {
    throw new Error(`GA4 test failed: ${test.message}`);
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

export async function saveGsc(formData: FormData) {
  const siteUrl = validateGscSite(String(formData.get("gsc_site_url") ?? ""));

  const integration = await loadIntegration();
  if (!integration?.service_account_json) {
    throw new Error(
      "Connect a Google service account before saving a Search Console site.",
    );
  }

  const key = integration.service_account_json as ServiceAccountKey;
  const test = await testSearchConsoleSite(key, siteUrl);
  if (!test.ok) {
    throw new Error(`Search Console test failed: ${test.message}`);
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
