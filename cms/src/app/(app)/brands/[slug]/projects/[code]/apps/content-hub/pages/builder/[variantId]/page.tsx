import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getProjectByCode } from "@/lib/project";
import { getTemplate } from "@pectus/content-hub/templates";
import { resolvePageUrl } from "@/lib/page-url";
import { slugify } from "@/lib/slugify";
import { EditPageChat } from "./EditPageChat";
import { PreviewFrame } from "./PreviewFrame";
import { PublishButton } from "./PublishButton";
import { LocaleSwitcher, type LocaleVariantStub } from "./LocaleSwitcher";
import { SlugEditor } from "./SlugEditor";

const PREVIEW_IFRAME_ID = "pectus-builder-preview";

function ancestorIds(path: string | null | undefined): string[] {
  if (!path) return [];
  return path.split("/").filter((s) => s.length > 0);
}

export default async function BuilderPage({
  params,
}: {
  params: Promise<{ code: string; variantId: string }>;
}) {
  const { code, variantId } = await params;
  const { supabase } = await requireUser();
  const ws = await getProjectByCode(code);

  const { data: variant } = await supabase
    .from("page_variants")
    .select(
      "id, locale, slug, title, blocks, status, page_id, last_published_path",
    )
    .eq("id", variantId)
    .single();
  if (!variant) notFound();

  const { data: page } = await supabase
    .from("pages")
    .select("id, template_id, purpose, status, site_plan_node_id, project_id")
    .eq("id", variant.page_id)
    .single();
  if (!page || page.project_id !== ws.id) notFound();

  const isHomepage = page.purpose === "home";
  /* Self-heal legacy homepage variants that were created with a non-empty
   * slug. Homepages live at the root URL (/), so the slug must be ''. */
  if (isHomepage && variant.slug !== "") {
    await supabase
      .from("page_variants")
      .update({ slug: "" })
      .eq("id", variant.id);
    variant.slug = "";
  }

  const template = getTemplate(page.template_id);

  /* All sibling variants — drives the locale switcher. */
  const { data: siblingVariants } = await supabase
    .from("page_variants")
    .select("id, locale, status")
    .eq("page_id", page.id);
  const variantsByLocale: Record<string, LocaleVariantStub | undefined> = {};
  for (const sv of (siblingVariants ?? []) as Array<{
    id: string;
    locale: string;
    status: "draft" | "published";
  }>) {
    variantsByLocale[sv.locale] = { variant_id: sv.id, status: sv.status };
  }
  const enabledLocales = ws.enabled_locales ?? [variant.locale];

  /* Resolve the URL the variant would publish at, so the Publish button can
   * preview the redirect that publishing would create. */
  let ancestorSlugs: string[] = [];
  if (page.site_plan_node_id) {
    const { data: ownNode } = await supabase
      .from("site_plan_nodes")
      .select("materialized_path")
      .eq("id", page.site_plan_node_id)
      .single();
    const ids = ancestorIds(ownNode?.materialized_path).filter(
      (id) => id !== page.site_plan_node_id,
    );
    if (ids.length > 0) {
      const [{ data: ancestorNodes }, { data: ancestorVariants }] =
        await Promise.all([
          supabase
            .from("site_plan_nodes")
            .select("id, title")
            .in("id", ids),
          supabase
            .from("page_variants")
            .select("slug, locale, page:pages!inner(site_plan_node_id)")
            .in(
              "page.site_plan_node_id" as unknown as string,
              ids,
            )
            .eq("locale", variant.locale),
        ]);
      const titleByNode = new Map(
        ((ancestorNodes ?? []) as Array<{ id: string; title: string }>).map(
          (n) => [n.id, n.title],
        ),
      );
      const slugByNode = new Map<string, string>();
      for (const row of (ancestorVariants ?? []) as Array<{
        slug: string;
        page:
          | { site_plan_node_id: string }
          | { site_plan_node_id: string }[];
      }>) {
        const np = Array.isArray(row.page) ? row.page[0] : row.page;
        if (np?.site_plan_node_id) slugByNode.set(np.site_plan_node_id, row.slug);
      }
      ancestorSlugs = ids.map(
        (id) => slugByNode.get(id) ?? slugify(titleByNode.get(id) ?? id),
      );
    }
  }
  const currentResolvedPath = resolvePageUrl({
    project: {
      mount_slug: ws.mount_slug ?? "/",
      default_locale: ws.default_locale ?? "en",
      default_locale_skips_prefix: ws.default_locale_skips_prefix ?? true,
    },
    locale: variant.locale,
    slug: variant.slug,
    ancestorSlugs,
  });

  /* In-CMS preview route. Same origin as the builder, so the iframe loads
   * instantly without a second dev server. Public route (outside (app)),
   * reads variant data via the service client. */
  const previewSrc = `/pectus-preview/${variantId}`;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {variant.title}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span
              title={`Template: defines the page's default block composition. ${template?.description ?? ""}`}
            >
              {template?.name ?? page.template_id}
            </span>
            <span aria-hidden>·</span>
            <span title="Purpose: what this page is for. Drives which template gallery shows in the Create Page flow.">
              {page.purpose}
            </span>
            <span aria-hidden>·</span>
            <LocaleSwitcher
              projectCode={code}
              currentVariantId={variantId}
              currentLocale={variant.locale}
              enabledLocales={enabledLocales}
              variantsByLocale={variantsByLocale}
            />
            <span aria-hidden>·</span>
            <SlugEditor
              projectCode={code}
              variantId={variantId}
              initialSlug={variant.slug}
              isHomepage={isHomepage}
            />
            <span aria-hidden>·</span>
            <span
              title={
                variant.status === "draft"
                  ? "Draft: edits are saved automatically but not visible to visitors. Publish to push live."
                  : "Published: this variant is live on your site. Edits create a new draft until you republish."
              }
            >
              {variant.status}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-3">
          <Link
            href={`/projects/${code}/apps/content-hub/pages`}
            className="text-sm text-zinc-600 hover:text-zinc-900"
            title="Back to the page tree."
          >
            ← Back to Pages
          </Link>
          <PublishButton
            projectCode={code}
            variantId={variantId}
            isPublished={variant.status === "published"}
            hasRepo={!!ws.content_hub_repo}
            lastPublishedPath={variant.last_published_path ?? null}
            currentResolvedPath={currentResolvedPath}
          />
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(320px,420px)_1fr] lg:items-start">
        <section className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white lg:sticky lg:top-4 lg:h-[calc(100vh-14rem)] lg:max-h-[calc(100vh-14rem)]">
          <div className="border-b border-zinc-100 px-4 py-3">
            <h2 className="text-sm font-semibold">Chat</h2>
            <p className="mt-1 text-xs text-gray-500">
              Each instruction calls the <code>edit-page</code> skill and
              rewrites the draft blocks. The preview reloads after each edit.
            </p>
          </div>
          <EditPageChat
            projectCode={code}
            variantId={variantId}
            previewIframeId={PREVIEW_IFRAME_ID}
          />
        </section>

        <section className="rounded-lg border border-gray-200 p-2 lg:p-3">
          <div className="flex items-center justify-between gap-3 px-2 pb-2">
            <h2 className="text-sm font-semibold">Live preview</h2>
            <a
              href={previewSrc}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-zinc-600 underline hover:text-zinc-900 lg:hidden"
              title="Mobile fallback. The iframe below renders the same page when the screen is wide enough."
            >
              Open preview ↗
            </a>
            <a
              href={previewSrc}
              target="_blank"
              rel="noreferrer"
              className="hidden text-xs text-zinc-500 underline hover:text-zinc-900 lg:inline"
              title="Open in a new tab."
            >
              Open in new tab ↗
            </a>
          </div>
          <PreviewFrame src={previewSrc} iframeId={PREVIEW_IFRAME_ID} />
        </section>
      </div>
    </div>
  );
}
