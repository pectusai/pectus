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

export const CONTENT_HUB_WORKSPACE_TABS = [
  { label: "Pages", segment: "pages" },
  { label: "Articles", segment: "articles" },
] as const;

export const CONTENT_HUB_WORKSPACE_SETTINGS = [
  { label: "Site URL", segment: "site-url" },
  { label: "Redirects", segment: "redirects" },
] as const;

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

export async function listApps(): Promise<AppListing[]> {
  const supabase = await createServerClient();
  const [manifests, { data: rows }] = await Promise.all([
    listAppManifests(),
    supabase.from("activated_apps").select("app_name, activated_at, status"),
  ]);
  const byName = new Map(
    (rows ?? []).map((r) => [
      r.app_name as string,
      {
        activated_at: r.activated_at as string,
        status: r.status as "active" | "paused",
      },
    ]),
  );
  return manifests.map((m) => {
    const row = byName.get(m.name);
    return {
      ...m,
      activated: row?.status === "active",
      activated_at: row?.activated_at ?? null,
      status: row?.status ?? null,
    };
  });
}

export async function isAppActive(appName: string): Promise<boolean> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("activated_apps")
    .select("status")
    .eq("app_name", appName)
    .maybeSingle();
  return data?.status === "active";
}

export async function getWorkspaceAppConfig<T = Record<string, unknown>>(
  workspaceId: string,
  appName: string,
): Promise<T | null> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("workspace_app_config")
    .select("config")
    .eq("workspace_id", workspaceId)
    .eq("app_name", appName)
    .maybeSingle();
  return (data?.config as T | undefined) ?? null;
}

export async function setWorkspaceAppConfig(
  workspaceId: string,
  appName: string,
  config: Record<string, unknown>,
) {
  const supabase = await createServerClient();
  await supabase.from("workspace_app_config").upsert(
    {
      workspace_id: workspaceId,
      app_name: appName,
      config,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id,app_name" },
  );
}

export async function activateApp(
  appName: string,
  config: Record<string, unknown> = {},
) {
  const supabase = await createServerClient();
  await supabase.from("activated_apps").upsert(
    { app_name: appName, status: "active", config },
    { onConflict: "app_name" },
  );
}

export async function deactivateApp(appName: string) {
  const supabase = await createServerClient();
  await supabase
    .from("activated_apps")
    .update({ status: "paused" })
    .eq("app_name", appName);
}
