import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { createServerClient } from "@pectus/supabase";

export type AppType = "inbound" | "outbound" | "unknown";

export type AppManifest = {
  name: string;
  type: AppType;
  description: string;
  version: string;
};

export type AppListing = AppManifest & {
  activated: boolean;
  activated_at: string | null;
  status: "active" | "paused" | null;
};

const APPS_DIR = path.join(process.cwd(), "..", "apps");

export type AppSidebarItem = {
  label: string;
  href: (base: string) => string;
};

export type AppSidebarManifest = {
  label: string;
  tooltip: string;
  items: AppSidebarItem[];
};

export const APP_SIDEBAR_MANIFESTS: Record<string, AppSidebarManifest> = {
  "content-hub": {
    label: "Content Hub",
    tooltip:
      "Publish pages and articles to a public site you control. Includes plan, gap analysis, sources, and reviews.",
    items: [
      { label: "Pages", href: (b) => `${b}/apps/content-hub/pages` },
      { label: "Articles", href: (b) => `${b}/apps/content-hub/articles` },
      { label: "Plan", href: (b) => `${b}/apps/content-hub/plan` },
      { label: "Gap", href: (b) => `${b}/apps/content-hub/gap` },
      { label: "Sources", href: (b) => `${b}/apps/content-hub/sources` },
      { label: "Reviews", href: (b) => `${b}/apps/content-hub/reviews` },
      {
        label: "Site URL",
        href: (b) => `${b}/apps/content-hub/settings/site-url`,
      },
      {
        label: "Redirects",
        href: (b) => `${b}/apps/content-hub/settings/redirects`,
      },
      {
        label: "Review policy",
        href: (b) => `${b}/apps/content-hub/settings/review-policy`,
      },
    ],
  },
  ga4: {
    label: "GA4",
    tooltip: "Google Analytics 4 traffic data.",
    items: [
      { label: "Performance", href: (b) => `${b}/apps/ga4/performance` },
    ],
  },
};

function parseFrontmatter(raw: string): Record<string, string> {
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const body = match[1];
  const out: Record<string, string> = {};
  for (const line of body.split("\n")) {
    const m = line.match(/^([a-zA-Z_][\w-]*):\s*(.*)$/);
    if (m && !m[2].startsWith("#")) {
      out[m[1]] = m[2].trim();
    }
  }
  return out;
}

async function readAppManifest(name: string): Promise<AppManifest | null> {
  try {
    const raw = await readFile(path.join(APPS_DIR, name, "APP.md"), "utf8");
    const fm = parseFrontmatter(raw);
    if (!fm.name) return null;
    // Skip apps marked as stubs in their APP.md frontmatter — they ship as
    // documentation only and don't function. Hides them from the activation
    // list so the user sees only apps that actually do something.
    if (fm.stub === "true") return null;
    const type: AppType =
      fm.type === "inbound" || fm.type === "outbound" ? fm.type : "unknown";
    return {
      name: fm.name,
      type,
      description: fm.description ?? "",
      version: fm.version ?? "0.0.0",
    };
  } catch {
    return null;
  }
}

export async function listAppManifests(): Promise<AppManifest[]> {
  const entries = await readdir(APPS_DIR, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  const manifests = await Promise.all(dirs.map((d) => readAppManifest(d)));
  return manifests.filter((m): m is AppManifest => m !== null);
}

export type ListAppsResult = {
  apps: AppListing[];
  schemaMissing: boolean;
};

export async function listAppsForProject(
  projectId: string,
): Promise<ListAppsResult> {
  const supabase = await createServerClient();
  const [manifests, { data: rows, error }] = await Promise.all([
    listAppManifests(),
    supabase
      .from("activated_apps")
      .select("app_name, activated_at, status")
      .eq("project_id", projectId),
  ]);

  const schemaMissing = isMissingTableError(error);

  const byName = new Map(
    (rows ?? []).map((r) => [
      r.app_name as string,
      {
        activated_at: r.activated_at as string,
        status: r.status as "active" | "paused",
      },
    ]),
  );
  const apps = manifests.map((m) => {
    const row = byName.get(m.name);
    return {
      ...m,
      activated: row?.status === "active",
      activated_at: row?.activated_at ?? null,
      status: row?.status ?? null,
    };
  });

  return { apps, schemaMissing };
}

function isMissingTableError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; message?: string };
  if (e.code === "42P01") return true;
  if (e.code === "PGRST205") return true;
  if (typeof e.message === "string") {
    if (/relation .*activated_apps.* does not exist/i.test(e.message)) return true;
    if (/Could not find the table.*activated_apps/i.test(e.message)) return true;
  }
  return false;
}

export async function isAppActiveForProject(
  projectId: string,
  appName: string,
): Promise<boolean> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("activated_apps")
    .select("status")
    .eq("project_id", projectId)
    .eq("app_name", appName)
    .maybeSingle();
  return data?.status === "active";
}

export async function listActivatedAppsForProject(
  projectId: string,
): Promise<string[]> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("activated_apps")
    .select("app_name")
    .eq("project_id", projectId)
    .eq("status", "active");
  return (data ?? []).map((r) => r.app_name as string);
}

export async function listActivatedAppsWithTypeForProject(
  projectId: string,
): Promise<{ name: string; type: AppType }[]> {
  const [activated, manifests] = await Promise.all([
    listActivatedAppsForProject(projectId),
    listAppManifests(),
  ]);
  const byName = new Map(manifests.map((m) => [m.name, m]));
  return activated.map((name) => ({
    name,
    type: byName.get(name)?.type ?? "unknown",
  }));
}

export async function getAppConfig<T = Record<string, unknown>>(
  projectId: string,
  appName: string,
): Promise<T | null> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("app_config")
    .select("config")
    .eq("project_id", projectId)
    .eq("app_name", appName)
    .maybeSingle();
  return (data?.config as T | undefined) ?? null;
}

export async function setAppConfig(
  projectId: string,
  appName: string,
  config: Record<string, unknown>,
) {
  const supabase = await createServerClient();
  await supabase.from("app_config").upsert(
    {
      project_id: projectId,
      app_name: appName,
      config,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "project_id,app_name" },
  );
}

export async function activateAppForProject(
  projectId: string,
  appName: string,
  config: Record<string, unknown> = {},
) {
  const supabase = await createServerClient();
  await supabase.from("activated_apps").upsert(
    { project_id: projectId, app_name: appName, status: "active", config },
    { onConflict: "project_id,app_name" },
  );
}

export async function deactivateAppForProject(
  projectId: string,
  appName: string,
) {
  const supabase = await createServerClient();
  await supabase
    .from("activated_apps")
    .update({ status: "paused" })
    .eq("project_id", projectId)
    .eq("app_name", appName);
}
