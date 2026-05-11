"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@pectus/supabase";
import { requireUser } from "@/lib/auth";
import { runSkill } from "@/lib/skill-runner";
import { commitPagePublish } from "@pectus/github";
import {
  buildPageJson,
  buildRedirectsJson,
  buildSitePlanJson,
  collapseRedirects,
  type RedirectRow,
  type SitePlanRow,
} from "@/lib/publish";
import { resolvePageUrl, pageJsonPath } from "@/lib/page-url";
import { slugify } from "@/lib/slugify";
import type { EditPageOutput } from "@pectus/skills/edit-page/schema";

export type ChatTurn = { role: "user" | "assistant"; text: string };

export async function applyEdit(args: {
  projectCode: string;
  variantId: string;
  instruction: string;
  chatHistory: ChatTurn[];
}): Promise<
  | {
      ok: true;
      summary: string;
      blocks: unknown[];
    }
  | { ok: false; error: string }
> {
  const { user } = await requireUser();
  const supabase = await createServerClient();

  const { data: ws } = await supabase
    .from("projects")
    .select("id, code")
    .eq("code", args.projectCode)
    .single();
  if (!ws) return { ok: false, error: "Project not found." };

  const { data: variant } = await supabase
    .from("page_variants")
    .select("id, locale, title, blocks, page_id")
    .eq("id", args.variantId)
    .single();
  if (!variant) return { ok: false, error: "Variant not found." };

  const { data: page } = await supabase
    .from("pages")
    .select("template_id, purpose, project_id")
    .eq("id", variant.page_id)
    .single();
  if (!page || page.project_id !== ws.id) {
    return { ok: false, error: "Page not in project." };
  }

  const result = await runSkill<EditPageOutput>({
    skill: "edit-page",
    projectId: ws.id,
    userId: user.id,
    args: {
      instruction: args.instruction,
      current_blocks: variant.blocks ?? [],
      page: {
        title: variant.title,
        purpose: page.purpose,
        template: page.template_id,
        locale: variant.locale,
      },
      chat_history: args.chatHistory,
    },
  });
  if (!result.ok) return { ok: false, error: result.error };
  if (result.mode !== "structured") {
    return { ok: false, error: "edit-page did not return structured output." };
  }

  /* Persist as the new draft AND update the variant's blocks (so the next
   * builder load sees the latest). page_drafts is the autosave checkpoint;
   * page_variants.blocks is the active draft state. */
  await Promise.all([
    supabase
      .from("page_variants")
      .update({
        blocks: result.output.blocks,
        draft_updated_at: new Date().toISOString(),
      })
      .eq("id", variant.id),
    supabase.from("page_drafts").upsert({
      page_variant_id: variant.id,
      blocks: result.output.blocks,
      saved_at: new Date().toISOString(),
    }),
  ]);

  revalidatePath(
    `/projects/${args.projectCode}/apps/content-hub/pages/builder/${args.variantId}`,
  );

  return {
    ok: true,
    summary: result.output.summary_of_change,
    blocks: result.output.blocks,
  };
}

/* ------------------------------------------------------------------------- *
 * publishVariant — commits the variant to the user's content-hub repo as a
 * single atomic commit (page JSON + per-locale site-plan + redirects). Auto-
 * generates a redirect row when the resolved URL differs from the variant's
 * last_published_path.
 * ------------------------------------------------------------------------- */

type SitePlanNodeRow = {
  id: string;
  parent_id: string | null;
  project_id: string;
  title: string;
  position: number;
  materialized_path: string;
  status: "suggested" | "adopted";
};

function ancestorIdsFromPath(path: string | null | undefined): string[] {
  if (!path) return [];
  return path.split("/").filter((s) => s.length > 0);
}

export async function publishVariant(args: {
  projectCode: string;
  variantId: string;
}): Promise<
  | { ok: true; url: string; commitSha: string; redirectAdded: RedirectRow | null }
  | { ok: false; error: string }
> {
  await requireUser();
  const supabase = await createServerClient();

  const { data: ws } = await supabase
    .from("projects")
    .select(
      "id, code, default_locale, enabled_locales, default_locale_skips_prefix, mount_slug, content_hub_repo, content_hub_branch",
    )
    .eq("code", args.projectCode)
    .single();
  if (!ws) return { ok: false, error: "Project not found." };
  if (!ws.content_hub_repo) {
    return {
      ok: false,
      error:
        "This project has no content_hub_repo set. Add it under Project Settings → Site URL before publishing.",
    };
  }

  const { data: variant } = await supabase
    .from("page_variants")
    .select(
      "id, page_id, locale, slug, title, meta_description, blocks, last_published_path",
    )
    .eq("id", args.variantId)
    .single();
  if (!variant) return { ok: false, error: "Variant not found." };

  const { data: page } = await supabase
    .from("pages")
    .select("id, project_id, template_id, purpose, site_plan_node_id")
    .eq("id", variant.page_id)
    .single();
  if (!page || page.project_id !== ws.id) {
    return { ok: false, error: "Page not in project." };
  }

  /* Collect all adopted nodes for the project — used both for the
   * ancestor walk and for the per-locale site-plan JSON. */
  const { data: nodesRaw } = await supabase
    .from("site_plan_nodes")
    .select("id, parent_id, project_id, title, position, materialized_path, status")
    .eq("project_id", ws.id);
  const nodes = (nodesRaw ?? []) as SitePlanNodeRow[];
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  /* For ancestor slugs we look up published variants in the same locale; if
   * the ancestor isn't published yet, we fall back to slugify(node.title). */
  let ancestorSlugs: string[] = [];
  if (page.site_plan_node_id) {
    const ownNode = nodeById.get(page.site_plan_node_id);
    const ancestorIds = ancestorIdsFromPath(ownNode?.materialized_path).filter(
      (id) => id !== page.site_plan_node_id,
    );
    if (ancestorIds.length > 0) {
      const { data: ancestorVariants } = await supabase
        .from("page_variants")
        .select("slug, locale, page:pages!inner(site_plan_node_id)")
        .in(
          "page.site_plan_node_id" as unknown as string,
          ancestorIds,
        )
        .eq("locale", variant.locale);
      const slugByNodeId = new Map<string, string>();
      for (const row of (ancestorVariants ?? []) as Array<{
        slug: string;
        page: { site_plan_node_id: string } | { site_plan_node_id: string }[];
      }>) {
        const np = Array.isArray(row.page) ? row.page[0] : row.page;
        if (np?.site_plan_node_id) slugByNodeId.set(np.site_plan_node_id, row.slug);
      }
      ancestorSlugs = ancestorIds.map((id) => {
        const fromVariant = slugByNodeId.get(id);
        if (fromVariant) return fromVariant;
        const node = nodeById.get(id);
        return slugify(node?.title ?? id);
      });
    }
  }

  const newPath = resolvePageUrl({
    project: {
      mount_slug: ws.mount_slug ?? "/",
      default_locale: ws.default_locale ?? "en",
      default_locale_skips_prefix: ws.default_locale_skips_prefix ?? true,
    },
    locale: variant.locale,
    slug: variant.slug,
    ancestorSlugs,
  });

  /* Redirect generation: if the variant was previously published at a
   * different URL, enqueue a slug-rename redirect. */
  let redirectAdded: RedirectRow | null = null;
  if (
    variant.last_published_path &&
    variant.last_published_path !== newPath
  ) {
    const { data: existing } = await supabase
      .from("redirects")
      .select("from_path, to_path, status")
      .eq("project_id", ws.id);
    const existingRows: RedirectRow[] = (existing ?? []).map((r) => ({
      from_path: r.from_path,
      to_path: r.to_path,
      status: r.status as 301 | 302,
    }));
    const collapsed = collapseRedirects(existingRows, {
      from: variant.last_published_path,
      to: newPath,
      status: 301,
    });

    /* Persist the diff. Easiest correct approach: replace the redirects
     * rows for the project with the collapsed list. */
    await supabase.from("redirects").delete().eq("project_id", ws.id);
    if (collapsed.length > 0) {
      await supabase.from("redirects").insert(
        collapsed.map((r) => ({
          project_id: ws.id,
          from_path: r.from_path,
          to_path: r.to_path,
          status: r.status,
          source: "slug-rename",
        })),
      );
    }
    redirectAdded =
      collapsed.find(
        (r) =>
          r.from_path === variant.last_published_path &&
          r.to_path === newPath,
      ) ??
      collapsed.find((r) => r.to_path === newPath) ??
      null;
  }

  const publishedAt = new Date().toISOString();

  const pageJson = buildPageJson({
    title: variant.title,
    meta_description: variant.meta_description ?? null,
    template_id: page.template_id,
    purpose: page.purpose,
    locale: variant.locale,
    slug: variant.slug,
    url: newPath,
    blocks: (variant.blocks ?? []) as Array<{
      type: string;
      props: Record<string, unknown>;
    }>,
    published_at: publishedAt,
  });

  /* Build the per-locale site-plan JSON. Includes every adopted node, its
   * resolved URL if the variant for this locale is published, and its
   * status. Powers the user's site nav rendering. */
  const { data: variantsForPlan } = await supabase
    .from("page_variants")
    .select(
      "slug, locale, status, page:pages!inner(site_plan_node_id, project_id)",
    )
    .eq("locale", variant.locale)
    .eq("page.project_id" as unknown as string, ws.id);
  const variantByNodeId = new Map<
    string,
    { slug: string; status: "draft" | "published" }
  >();
  for (const row of (variantsForPlan ?? []) as Array<{
    slug: string;
    status: string;
    page:
      | { site_plan_node_id: string | null }
      | { site_plan_node_id: string | null }[];
  }>) {
    const np = Array.isArray(row.page) ? row.page[0] : row.page;
    if (np?.site_plan_node_id) {
      variantByNodeId.set(np.site_plan_node_id, {
        slug: row.slug,
        status: row.status as "draft" | "published",
      });
    }
  }
  /* The variant we're publishing might not yet be marked 'published' in DB
   * (we update it below). Patch the in-memory map so the snapshot reflects
   * post-publish state. */
  if (page.site_plan_node_id) {
    variantByNodeId.set(page.site_plan_node_id, {
      slug: variant.slug,
      status: "published",
    });
  }

  const planRows: SitePlanRow[] = nodes
    .filter((n) => n.status === "adopted")
    .map((n) => {
      const v = variantByNodeId.get(n.id);
      const ancestorIds = ancestorIdsFromPath(n.materialized_path).filter(
        (id) => id !== n.id,
      );
      const planAncestorSlugs = ancestorIds.map((id) => {
        const av = variantByNodeId.get(id);
        if (av) return av.slug;
        const an = nodeById.get(id);
        return slugify(an?.title ?? id);
      });
      const url = v
        ? resolvePageUrl({
            project: {
              mount_slug: ws.mount_slug ?? "/",
              default_locale: ws.default_locale ?? "en",
              default_locale_skips_prefix:
                ws.default_locale_skips_prefix ?? true,
            },
            locale: variant.locale,
            slug: v.slug,
            ancestorSlugs: planAncestorSlugs,
          })
        : null;
      return {
        node_id: n.id,
        parent_id: n.parent_id,
        title: n.title,
        position: n.position,
        materialized_path: n.materialized_path,
        url,
        status: v ? v.status : "planned",
      };
    });

  const sitePlanJson = buildSitePlanJson({
    locale: variant.locale,
    generated_at: publishedAt,
    nodes: planRows,
  });

  /* Pull final redirect set for the JSON file. */
  const { data: redirectsFinal } = await supabase
    .from("redirects")
    .select("from_path, to_path, status")
    .eq("project_id", ws.id);
  const redirectsJson = buildRedirectsJson(
    (redirectsFinal ?? []).map((r) => ({
      from_path: r.from_path,
      to_path: r.to_path,
      status: r.status as 301 | 302,
    })),
  );

  const repoString = ws.content_hub_repo;
  const slashIdx = repoString.indexOf("/");
  if (slashIdx <= 0) {
    return {
      ok: false,
      error: `content_hub_repo must be in the form 'owner/repo'. Got '${repoString}'.`,
    };
  }
  const owner = repoString.slice(0, slashIdx);
  const repo = repoString.slice(slashIdx + 1);

  let commitSha: string;
  try {
    const result = await commitPagePublish(
      { owner, repo, branch: ws.content_hub_branch ?? "main" },
      {
        pagePath: pageJsonPath({
          locale: variant.locale,
          ancestorSlugs,
          slug: variant.slug,
        }),
        pageJson,
        sitePlanPath: `content/site-plan-${variant.locale}.json`,
        sitePlanJson,
        redirectsPath: "content/redirects.json",
        redirectsJson,
        title: variant.title,
        projectCode: ws.code,
      },
    );
    commitSha = result.sha;
  } catch (err) {
    return {
      ok: false,
      error: `GitHub commit failed: ${(err as Error).message}`,
    };
  }

  await Promise.all([
    supabase
      .from("page_variants")
      .update({
        status: "published",
        published_at: publishedAt,
        last_published_path: newPath,
      })
      .eq("id", variant.id),
    supabase
      .from("pages")
      .update({
        status: "published",
        mount_slug_at_publish: ws.mount_slug ?? "/",
        updated_at: publishedAt,
      })
      .eq("id", page.id),
  ]);

  revalidatePath(
    `/projects/${args.projectCode}/apps/content-hub/pages/builder/${args.variantId}`,
  );
  revalidatePath(`/projects/${args.projectCode}/apps/content-hub/pages`);

  return { ok: true, url: newPath, commitSha, redirectAdded };
}

/* ------------------------------------------------------------------------- *
 * Locale variant management
 * ------------------------------------------------------------------------- */

/** Switch the builder to a sibling variant. If a variant for the requested
 * locale already exists, redirects to it. If not, creates one (slug copied
 * from the source variant, blocks copied as the starting point — user can
 * edit per the "manual only" rule) and redirects.
 *
 * Note on the "manual only" feedback: the locale switcher creates an empty
 * draft for the new locale ON DEMAND when the user explicitly switches; it
 * does not auto-fan-out across locales. Blocks are copied so the user
 * doesn't start from blank — they must rewrite/translate the content. */
export async function switchOrCreateVariantForLocale(args: {
  projectCode: string;
  fromVariantId: string;
  targetLocale: string;
}): Promise<never | { ok: false; error: string }> {
  const { user } = await requireUser();
  void user;
  const supabase = await createServerClient();

  const { data: source } = await supabase
    .from("page_variants")
    .select("id, page_id, locale, slug, title, meta_description, blocks")
    .eq("id", args.fromVariantId)
    .single();
  if (!source) return { ok: false, error: "Source variant not found." };

  const { data: existing } = await supabase
    .from("page_variants")
    .select("id")
    .eq("page_id", source.page_id)
    .eq("locale", args.targetLocale)
    .maybeSingle();

  if (existing) {
    redirect(
      `/projects/${args.projectCode}/apps/content-hub/pages/builder/${existing.id}`,
    );
  }

  const { data: created, error } = await supabase
    .from("page_variants")
    .insert({
      page_id: source.page_id,
      locale: args.targetLocale,
      slug: source.slug,
      title: source.title,
      meta_description: source.meta_description,
      blocks: source.blocks,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !created) {
    return {
      ok: false,
      error: `Failed to create variant for ${args.targetLocale}: ${error?.message ?? "unknown error"}`,
    };
  }

  revalidatePath(`/projects/${args.projectCode}/apps/content-hub/pages`);
  redirect(
    `/projects/${args.projectCode}/apps/content-hub/pages/builder/${created.id}`,
  );
}

/** Update the slug for a variant. Does not republish — the user has to
 * click Publish, at which point the publish flow detects the slug change
 * via last_published_path and emits a redirect. */
export async function updateVariantSlug(args: {
  projectCode: string;
  variantId: string;
  slug: string;
}): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  await requireUser();
  const supabase = await createServerClient();

  const { data: variantRow, error: variantErr } = await supabase
    .from("page_variants")
    .select("page:pages!inner(purpose)")
    .eq("id", args.variantId)
    .single();
  if (variantErr || !variantRow) {
    return { ok: false, error: variantErr?.message ?? "Variant not found." };
  }
  const pageRow = Array.isArray(variantRow.page)
    ? variantRow.page[0]
    : variantRow.page;
  const isHomepage = pageRow?.purpose === "home";

  const slug = args.slug.trim() ? slugify(args.slug) : "";
  if (!isHomepage && !slug) {
    return {
      ok: false,
      error: "Slug must contain at least one letter or digit.",
    };
  }

  const { error } = await supabase
    .from("page_variants")
    .update({ slug, draft_updated_at: new Date().toISOString() })
    .eq("id", args.variantId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(
    `/projects/${args.projectCode}/apps/content-hub/pages/builder/${args.variantId}`,
  );
  return { ok: true, slug };
}
