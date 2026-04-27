import { notFound } from "next/navigation";
import { createServerClient } from "@pectus/supabase";

export type Workspace = {
  id: string;
  name: string;
  code: string;
  locale: string;
  created_at: string;
  updated_at: string;
};

export type Freshness = {
  workspace_id: string;
  surface: string;
  last_updated_at: string;
  source: string | null;
};

export async function getWorkspaceByCode(code: string): Promise<Workspace> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("workspaces")
    .select("*")
    .eq("code", code)
    .single();

  if (!data) notFound();
  return data as Workspace;
}

export function describeAge(isoDate: string | null | undefined): {
  days: number | null;
  label: string;
  level: "fresh" | "aging" | "stale" | "missing";
} {
  if (!isoDate) {
    return { days: null, label: "No data yet", level: "missing" };
  }

  const days = Math.floor(
    (Date.now() - new Date(isoDate).getTime()) / (24 * 60 * 60 * 1000),
  );
  const absLabel =
    days === 0
      ? "Today"
      : days === 1
        ? "Yesterday"
        : days < 30
          ? `${days} days ago`
          : days < 365
            ? `${Math.floor(days / 30)} months ago`
            : `${Math.floor(days / 365)} years ago`;

  const level = days <= 30 ? "fresh" : days <= 90 ? "aging" : "stale";
  return { days, label: absLabel, level };
}

export async function touchFreshness(
  workspaceId: string,
  surface: string,
  source?: string,
) {
  const supabase = await createServerClient();
  await supabase.from("workspace_data_freshness").upsert(
    {
      workspace_id: workspaceId,
      surface,
      last_updated_at: new Date().toISOString(),
      source: source ?? null,
    },
    { onConflict: "workspace_id,surface" },
  );
}
