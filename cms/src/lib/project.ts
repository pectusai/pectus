import { notFound } from "next/navigation";
import { createServerClient } from "@pectus/supabase";

export type Project = {
  id: string;
  name: string;
  code: string;
  locale: string;
  mode?: "seed" | "live";
  default_locale?: string;
  enabled_locales?: string[];
  default_locale_skips_prefix?: boolean;
  mount_slug?: string;
  content_insights_repo?: string | null;
  content_insights_branch?: string;
  created_at: string;
  updated_at: string;
};

export type Freshness = {
  project_id: string;
  surface: string;
  last_updated_at: string;
  source: string | null;
};

export async function getProjectByCode(code: string): Promise<Project> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("code", code)
    .single();

  if (!data) notFound();
  return data as Project;
}

export async function listProjectsForBrand(
  brandId: string,
): Promise<Pick<Project, "id" | "name" | "code" | "locale">[]> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("projects")
    .select("id, name, code, locale")
    .eq("brand_id", brandId)
    .order("name", { ascending: true });
  return (data ?? []) as Pick<Project, "id" | "name" | "code" | "locale">[];
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
  projectId: string,
  surface: string,
  source?: string,
) {
  const supabase = await createServerClient();
  await supabase.from("project_data_freshness").upsert(
    {
      project_id: projectId,
      surface,
      last_updated_at: new Date().toISOString(),
      source: source ?? null,
    },
    { onConflict: "project_id,surface" },
  );
}
