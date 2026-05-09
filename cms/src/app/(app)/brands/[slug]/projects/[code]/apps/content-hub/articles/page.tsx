import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getBrandBySlug } from "@/lib/active-brand";
import { isAppActiveForProject } from "@/lib/apps";
import { ActivateAppPointer } from "@/app/components/ActivateAppPointer";
import { ArticlesBulkBar, type ArticleRow } from "./ArticlesBulkBar";
import { ImportForm } from "./ImportForm";

export const dynamic = "force-dynamic";

const STATUS_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "imported", label: "Imported" },
  { value: "draft", label: "Draft" },
  { value: "brand_review", label: "Brand review" },
  { value: "market_lead_review", label: "Market lead review" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

const PAGE_LIMIT = 50;

export default async function ArticlesIndexPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; code: string }>;
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const [{ slug, code }, query] = await Promise.all([params, searchParams]);
  const { supabase } = await requireUser();
  const brand = await getBrandBySlug(slug);
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("brand_id", brand.id)
    .eq("code", code)
    .maybeSingle();
  if (!project) notFound();
  if (!(await isAppActiveForProject(project.id, "content-hub"))) {
    return <ActivateAppPointer appName="content-hub" surface="Articles" />;
  }

  const q = (query.q ?? "").trim();
  const statusFilter = (query.status ?? "").trim();
  const articleBase = `/brands/${slug}/projects/${code}/apps/content-hub/articles`;

  const baseSelect =
    "id, slug, title, category, author, date_published, word_count, status, source";

  let articles: ArticleRow[] = [];
  let total = 0;

  if (statusFilter) {
    let single = supabase
      .from("articles")
      .select(baseSelect, { count: "exact" })
      .eq("project_id", project.id)
      .eq("status", statusFilter)
      .order(
        statusFilter === "published" ? "date_published" : "date_modified",
        { ascending: false, nullsFirst: false },
      )
      .limit(PAGE_LIMIT);
    if (q) single = single.ilike("title", `%${q}%`);
    const { data, count } = await single;
    articles = ((data ?? []) as ArticleRow[]).map((a) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      category: a.category ?? null,
      author: a.author ?? null,
      date_published: a.date_published ?? null,
      word_count: a.word_count ?? 0,
      status: a.status ?? "draft",
    }));
    total = count ?? articles.length;
  } else {
    let draftsQ = supabase
      .from("articles")
      .select(baseSelect, { count: "exact" })
      .eq("project_id", project.id)
      .eq("status", "draft")
      .order("date_modified", { ascending: false, nullsFirst: false })
      .limit(PAGE_LIMIT);
    let othersQ = supabase
      .from("articles")
      .select(baseSelect, { count: "exact" })
      .eq("project_id", project.id)
      .neq("status", "draft")
      .order("date_published", { ascending: false, nullsFirst: false })
      .order("date_modified", { ascending: false, nullsFirst: false })
      .limit(PAGE_LIMIT);
    if (q) {
      draftsQ = draftsQ.ilike("title", `%${q}%`);
      othersQ = othersQ.ilike("title", `%${q}%`);
    }
    const [drafts, others] = await Promise.all([draftsQ, othersQ]);
    const list: ArticleRow[] = [
      ...((drafts.data ?? []) as ArticleRow[]),
      ...((others.data ?? []) as ArticleRow[]),
    ]
      .slice(0, PAGE_LIMIT)
      .map((a) => ({
        id: a.id,
        slug: a.slug,
        title: a.title,
        category: a.category ?? null,
        author: a.author ?? null,
        date_published: a.date_published ?? null,
        word_count: a.word_count ?? 0,
        status: a.status ?? "draft",
      }));
    articles = list;
    total = (drafts.count ?? drafts.data?.length ?? 0) + (others.count ?? others.data?.length ?? 0);
  }

  const [{ data: categoryRows }, { data: brandRow }] = await Promise.all([
    supabase
      .from("articles")
      .select("category")
      .eq("project_id", project.id)
      .not("category", "is", null),
    supabase.from("brands").select("sitemap_url").eq("slug", slug).maybeSingle(),
  ]);
  const knownCategories = Array.from(
    new Set(
      (categoryRows ?? [])
        .map((r) => (r.category as string | null)?.trim())
        .filter((s): s is string => !!s),
    ),
  ).sort();
  const defaultSitemap = brandRow?.sitemap_url ?? "";

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Articles{" "}
            <span className="font-normal text-zinc-500">
              ({total.toLocaleString("en-US")})
            </span>
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Write new articles, edit existing ones, and import what&apos;s
            already on your site so the analysis knows what you&apos;ve covered.
          </p>
        </div>
        <Link
          href={`${articleBase}/new`}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
        >
          + New article
        </Link>
      </div>

      <form
        action={`${articleBase}`}
        method="get"
        className="mt-5 flex flex-wrap items-center gap-2"
      >
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search title…"
          className="h-[36px] w-full max-w-xs rounded-md border border-zinc-300 bg-white px-3 text-sm focus:border-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-200"
        />
        <select
          name="status"
          defaultValue={statusFilter}
          className="h-[36px] rounded-md border border-zinc-300 bg-white px-2 text-sm focus:border-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-200"
        >
          {STATUS_FILTER_OPTIONS.map((o) => (
            <option key={o.value || "_all"} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 hover:border-zinc-400"
        >
          Apply
        </button>
        {q || statusFilter ? (
          <Link
            href={articleBase}
            className="text-sm text-zinc-500 hover:text-zinc-900"
          >
            Clear
          </Link>
        ) : null}
      </form>

      {knownCategories.length > 0 ? (
        <p className="mt-3 text-xs text-zinc-500">
          Categories seen:{" "}
          <span className="text-zinc-700">{knownCategories.join(", ")}</span>
        </p>
      ) : null}

      <details className="mt-6 rounded-lg border border-zinc-200 bg-white px-5 py-3">
        <summary className="cursor-pointer text-sm font-medium text-zinc-900">
          Import from your existing site
        </summary>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          Reads your sitemap, fetches each URL, parses the HTML, and upserts
          into your articles table. Re-running is safe; rows are matched on
          slug.
        </p>
        <div className="mt-3">
          <ImportForm projectCode={code} defaultSitemap={defaultSitemap} />
        </div>
      </details>

      <section className="mt-8">
        {articles.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
            <p className="text-sm text-zinc-600">
              {q || statusFilter
                ? "No articles match this filter. Clear it or change the search."
                : "No articles yet. Click + New article to draft one, or open the importer above to pull in your existing site."}
            </p>
          </div>
        ) : (
          <ArticlesBulkBar
            brandSlug={slug}
            code={code}
            articleBase={articleBase}
            rows={articles}
          />
        )}
        <p className="mt-3 text-xs text-zinc-500">
          Showing first {Math.min(articles.length, PAGE_LIMIT)} of{" "}
          {total.toLocaleString("en-US")}.{" "}
          {total > PAGE_LIMIT ? "Pagination coming next iteration." : null}
        </p>
      </section>
    </div>
  );
}
