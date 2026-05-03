"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getWorkspaceByCode } from "@/lib/workspace";
import { resolvePageUrl, pageJsonPath } from "@/lib/page-url";
import { slugify } from "@/lib/slugify";
import {
  buildPageJson,
  buildRedirectsJson,
  buildSitePlanJson,
  collapseRedirects,
  type RedirectRow,
  type SitePlanRow,
} from "@/lib/publish";
import { commitChanges } from "@pectus/github";

function normalizeMountSlug(raw: string): string {
  let s = raw.trim();
  if (!s.startsWith("/")) s = `/${s}`;
  if (!s.endsWith("/")) s = `${s}/`;
  return s;
}

export async function saveSiteUrl(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const mountSlugRaw = String(formData.get("mount_slug") ?? "/");
  const defaultLocale = String(formData.get("default_locale") ?? "en").trim();
  const enabledLocalesRaw = String(formData.get("enabled_locales") ?? "");
  const skipPrefix = formData.get("default_locale_skips_prefix") === "on";
  const contentHubRepo =
    String(formData.get("content_hub_repo") ?? "").trim() || null;
  const contentHubBranch =
    String(formData.get("content_hub_branch") ?? "main").trim() || "main";
  const intent = String(formData.get("intent") ?? "save");

  if (!code) return;

  const mountSlug = normalizeMountSlug(mountSlugRaw);
  const enabledLocales = Array.from(
    new Set(
      enabledLocalesRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  );
  if (!enabledLocales.includes(defaultLocale)) {
    enabledLocales.unshift(defaultLocale);
  }

  const { supabase } = await requireAdmin();
  const workspace = await getWorkspaceByCode(code);

  /* Save the new config first. The republish branch (intent='republish') then
   * walks every published variant and recomputes URLs against the new
   * config, generating redirects for anything that moved. */
  await supabase
    .from("workspaces")
    .update({
      mount_slug: mountSlug,
      default_locale: defaultLocale,
      enabled_locales: enabledLocales,
      default_locale_skips_prefix: skipPrefix,
      content_hub_repo: contentHubRepo,
      content_hub_branch: contentHubBranch,
    })
    .eq("id", workspace.id);

  if (intent === "republish") {
    await republishWorkspace(supabase, workspace.id, code);
  }

  revalidatePath(`/workspaces/${code}/settings/site-url`);
  revalidatePath(`/workspaces/${code}/settings`);
  revalidatePath(`/workspaces/${code}/pages`);
}

async function republishWorkspace(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  workspaceId: string,
  code: string,
): Promise<void> {
  const { data: ws } = await supabase
    .from("workspaces")
    .select(
      "id, code, default_locale, enabled_locales, default_locale_skips_prefix, mount_slug, content_hub_repo, content_hub_branch",
    )
    .eq("id", workspaceId)
    .single();
  if (!ws || !ws.content_hub_repo) return;

  const slashIdx = ws.content_hub_repo.indexOf("/");
  if (slashIdx <= 0) return;
  const owner = ws.content_hub_repo.slice(0, slashIdx);
  const repo = ws.content_hub_repo.slice(slashIdx + 1);
  const branch = ws.content_hub_branch ?? "main";

  const { data: variants } = await supabase
    .from("page_variants")
    .select(
      "id, page_id, locale, slug, title, meta_description, blocks, last_published_path, status, page:pages!inner(template_id, purpose, site_plan_node_id, workspace_id)",
    )
    .eq("page.workspace_id" as unknown as string, ws.id)
    .eq("status", "published");

  const { data: nodesRaw } = await supabase
    .from("site_plan_nodes")
    .select("id, parent_id, title, position, materialized_path, status")
    .eq("workspace_id", ws.id);
  const nodes = (nodesRaw ?? []) as Array<{
    id: string;
    parent_id: string | null;
    title: string;
    position: number;
    materialized_path: string;
    status: "suggested" | "adopted";
  }>;
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  const wsCfg = {
    mount_slug: ws.mount_slug ?? "/",
    default_locale: ws.default_locale ?? "en",
    default_locale_skips_prefix: ws.default_locale_skips_prefix ?? true,
  };

  /* Build a quick (locale, node_id) → slug map from currently-published
   * variants, used for ancestor-slug resolution. */
  const slugByLocaleNode = new Map<string, Map<string, string>>();
  for (const v of (variants ?? []) as Array<{
    locale: string;
    slug: string;
    page:
      | { site_plan_node_id: string | null }
      | { site_plan_node_id: string | null }[];
  }>) {
    const np = Array.isArray(v.page) ? v.page[0] : v.page;
    if (!np?.site_plan_node_id) continue;
    let inner = slugByLocaleNode.get(v.locale);
    if (!inner) {
      inner = new Map();
      slugByLocaleNode.set(v.locale, inner);
    }
    inner.set(np.site_plan_node_id, v.slug);
  }
  function ancestorSlugsFor(locale: string, ownNodeId: string): string[] {
    const own = nodeById.get(ownNodeId);
    if (!own) return [];
    const ids = own.materialized_path
      .split("/")
      .filter((s) => s.length > 0)
      .filter((id) => id !== ownNodeId);
    const slugs = slugByLocaleNode.get(locale) ?? new Map<string, string>();
    return ids.map((id) => {
      const s = slugs.get(id);
      if (s) return s;
      return slugify(nodeById.get(id)?.title ?? id);
    });
  }

  /* Compute the redirect proposal for every published variant whose URL
   * changed. */
  const { data: existingRedirects } = await supabase
    .from("redirects")
    .select("from_path, to_path, status")
    .eq("workspace_id", ws.id);
  let redirectRows: RedirectRow[] = (existingRedirects ?? []).map((r) => ({
    from_path: r.from_path,
    to_path: r.to_path,
    status: r.status as 301 | 302,
  }));

  const variantsToUpdate: Array<{
    id: string;
    newPath: string;
    locale: string;
    slug: string;
    title: string;
    meta_description: string | null;
    blocks: unknown[];
    page:
      | {
          template_id: string;
          purpose: string;
          site_plan_node_id: string | null;
        }
      | {
          template_id: string;
          purpose: string;
          site_plan_node_id: string | null;
        }[];
  }> = [];

  for (const v of (variants ?? []) as Array<{
    id: string;
    locale: string;
    slug: string;
    title: string;
    meta_description: string | null;
    blocks: unknown[];
    last_published_path: string | null;
    page:
      | {
          template_id: string;
          purpose: string;
          site_plan_node_id: string | null;
        }
      | {
          template_id: string;
          purpose: string;
          site_plan_node_id: string | null;
        }[];
  }>) {
    const np = Array.isArray(v.page) ? v.page[0] : v.page;
    const ancestorSlugs = np?.site_plan_node_id
      ? ancestorSlugsFor(v.locale, np.site_plan_node_id)
      : [];
    const newPath = resolvePageUrl({
      workspace: wsCfg,
      locale: v.locale,
      slug: v.slug,
      ancestorSlugs,
    });
    if (v.last_published_path && v.last_published_path !== newPath) {
      redirectRows = collapseRedirects(redirectRows, {
        from: v.last_published_path,
        to: newPath,
        status: 301,
      });
    }
    variantsToUpdate.push({
      id: v.id,
      newPath,
      locale: v.locale,
      slug: v.slug,
      title: v.title,
      meta_description: v.meta_description,
      blocks: v.blocks,
      page: v.page,
    });
  }

  /* Persist redirects, then build commits. */
  await supabase.from("redirects").delete().eq("workspace_id", ws.id);
  if (redirectRows.length > 0) {
    await supabase.from("redirects").insert(
      redirectRows.map((r) => ({
        workspace_id: ws.id,
        from_path: r.from_path,
        to_path: r.to_path,
        status: r.status,
        source: "slug-rename",
      })),
    );
  }

  /* Build per-locale site-plan rows. One file per enabled locale. */
  const enabledLocales = (ws.enabled_locales ?? [ws.default_locale ?? "en"]) as string[];
  const sitePlansByLocale = new Map<string, SitePlanRow[]>();
  for (const locale of enabledLocales) {
    const rows: SitePlanRow[] = nodes
      .filter((n) => n.status === "adopted")
      .map((n) => {
        const slug = slugByLocaleNode.get(locale)?.get(n.id);
        const ancestorSlugs = ancestorSlugsFor(locale, n.id);
        const url = slug
          ? resolvePageUrl({
              workspace: wsCfg,
              locale,
              slug,
              ancestorSlugs,
            })
          : null;
        return {
          node_id: n.id,
          parent_id: n.parent_id,
          title: n.title,
          position: n.position,
          materialized_path: n.materialized_path,
          url,
          status: slug ? "published" : "planned",
        };
      });
    sitePlansByLocale.set(locale, rows);
  }

  const publishedAt = new Date().toISOString();

  /* Compose the multi-file commit. Pages move to their new paths (delete
   * old + write new), site-plan files refresh, redirects.json refreshes. */
  const fileChanges: Array<
    | { path: string; content: string }
    | { path: string; delete: true }
  > = [];

  for (const v of variantsToUpdate) {
    const np = Array.isArray(v.page) ? v.page[0] : v.page;
    const ancestorSlugs = np?.site_plan_node_id
      ? ancestorSlugsFor(v.locale, np.site_plan_node_id)
      : [];
    const newPagePath = pageJsonPath({
      locale: v.locale,
      ancestorSlugs,
      slug: v.slug,
    });
    const pageJson = buildPageJson({
      title: v.title,
      meta_description: v.meta_description,
      template_id: np.template_id,
      purpose: np.purpose,
      locale: v.locale,
      slug: v.slug,
      url: v.newPath,
      blocks: (v.blocks ?? []) as Array<{
        type: string;
        props: Record<string, unknown>;
      }>,
      published_at: publishedAt,
    });
    fileChanges.push({ path: newPagePath, content: pageJson });
  }
  for (const [locale, rows] of sitePlansByLocale) {
    fileChanges.push({
      path: `content/site-plan-${locale}.json`,
      content: buildSitePlanJson({
        locale,
        generated_at: publishedAt,
        nodes: rows,
      }),
    });
  }
  fileChanges.push({
    path: "content/redirects.json",
    content: buildRedirectsJson(redirectRows),
  });

  if (fileChanges.length > 0) {
    try {
      await commitChanges(
        { owner, repo, branch },
        fileChanges,
        `content: republish ${variantsToUpdate.length} pages after Site URL change (${code})`,
      );
    } catch {
      /* Surface failure on the page via revalidatePath; the user can retry. */
    }
  }

  /* Update last_published_path on each variant. */
  await Promise.all(
    variantsToUpdate.map((v) =>
      supabase
        .from("page_variants")
        .update({
          last_published_path: v.newPath,
          published_at: publishedAt,
        })
        .eq("id", v.id),
    ),
  );
}
