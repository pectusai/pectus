import { createServerClient } from "@pectus/supabase";
import type { Missing } from "@/app/components/NeedsCard";

type Surface =
  | "site-plan"
  | "gap"
  | "ga4-performance"
  | "gsc-keywords"
  | "publish";

export async function checkPrereqs(
  surface: Surface,
  ctx: { brandId: string; brandSlug: string; projectId: string; projectCode: string },
): Promise<{ ok: true } | { ok: false; missing: Missing[] }> {
  const supabase = await createServerClient();
  const projectBase = `/brands/${ctx.brandSlug}/projects/${ctx.projectCode}`;
  const brandBase = `/brands/${ctx.brandSlug}`;

  const missing: Missing[] = [];

  if (surface === "site-plan" || surface === "gap") {
    const { count: keywordCount } = await supabase
      .from("keywords")
      .select("id", { count: "exact", head: true })
      .eq("project_id", ctx.projectId);
    if ((keywordCount ?? 0) === 0) {
      missing.push({
        name: "Add keywords",
        fixHref: `${projectBase}/keywords`,
        fixLabel: "Open Keywords",
      });
    }
  }

  if (surface === "gap") {
    const { data: icp } = await supabase
      .from("icp_profiles")
      .select("personas")
      .eq("project_id", ctx.projectId)
      .maybeSingle();
    const personas = (icp?.personas as unknown[] | null) ?? [];
    if (personas.length === 0) {
      missing.push({
        name: "Define ICP personas",
        fixHref: `${projectBase}/icp`,
        fixLabel: "Open ICP",
      });
    }
  }

  if (surface === "ga4-performance") {
    const { data: integration } = await supabase
      .from("integrations")
      .select("ga4_property_id, service_account_json")
      .eq("brand_id", ctx.brandId)
      .eq("provider", "google")
      .maybeSingle();
    if (!integration?.service_account_json) {
      missing.push({
        name: "Connect Google service account",
        fixHref: `${brandBase}/settings/integrations/google`,
        fixLabel: "Open Google integration",
      });
    } else if (!integration?.ga4_property_id) {
      missing.push({
        name: "Set GA4 property ID",
        fixHref: `${brandBase}/settings/integrations/google#ga4`,
        fixLabel: "Open Google integration",
      });
    }
  }

  if (surface === "gsc-keywords") {
    const { data: integration } = await supabase
      .from("integrations")
      .select("gsc_site_url, service_account_json")
      .eq("brand_id", ctx.brandId)
      .eq("provider", "google")
      .maybeSingle();
    if (!integration?.service_account_json) {
      missing.push({
        name: "Connect Google service account",
        fixHref: `${brandBase}/settings/integrations/google`,
        fixLabel: "Open Google integration",
      });
    } else if (!integration?.gsc_site_url) {
      missing.push({
        name: "Set Search Console site",
        fixHref: `${brandBase}/settings/integrations/google#gsc`,
        fixLabel: "Open Google integration",
      });
    }
  }

  if (surface === "publish") {
    const { data: project } = await supabase
      .from("projects")
      .select("content_hub_repo")
      .eq("id", ctx.projectId)
      .maybeSingle();
    if (!project?.content_hub_repo) {
      missing.push({
        name: "Configure GitHub publish target",
        fixHref: `${projectBase}/apps/content-hub/settings/site-url`,
        fixLabel: "Open Site URL settings",
      });
    }
  }

  return missing.length === 0 ? { ok: true } : { ok: false, missing };
}
