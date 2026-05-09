import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getBrandBySlug } from "@/lib/active-brand";
import { isAppActiveForProject } from "@/lib/apps";
import { ActivateAppPointer } from "@/app/components/ActivateAppPointer";
import {
  STATUS_LABELS,
  isStatus,
  type ArticleStatus,
} from "@/lib/article-status";
import { FetchArticleButton } from "./FetchArticleButton";
import { ImportForm } from "./ImportForm";

export const dynamic = "force-dynamic";

const STATUS_PILL: Record<ArticleStatus, string> = {
  imported: "bg-pink-100 text-pink-800",
  draft: "bg-zinc-100 text-zinc-700",
  brand_review: "bg-amber-100 text-amber-800",
  market_lead_review: "bg-blue-100 text-blue-800",
  published: "bg-emerald-100 text-emerald-800",
  archived: "bg-zinc-100 text-zinc-500",
};

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

  type ArticleRow = {
    id: string;
    slug: string;
    title: string;
    category: string | null;
    author: string | null;
    date_published: string | null;
    word_count: number | null;
    status: string | null;
    source: string | null;
  };

  const baseSelect =
    "id, slug, title, category, author, date_published, word_count, status, source";

  let articles: ArticleRow[] = [];
  let total = 0;
  let categoriesResultPromise = supabase
    .from("articles")
    .select("category")
    .eq("project_id", project.id)
    .not("category", "is", null);
  let brandRowPromise = supabase
    .from("brands")
    .select("sitemap_url")
    .eq("slug", slug)
    .maybeSingle();

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

    const [listResult, categoriesResult, brandRow] = await Promise.all([
      single,
      categoriesResultPromise,
      brandRowPromise,
    ]);
    articles = (listResult.data ?? []) as ArticleRow[];
    total = listResult.count ?? articles.length;
    categoriesResultPromise = Promise.resolve(categoriesResult) as never;
    brandRowPromise = Promise.resolve(brandRow) as never;
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

    const [draftsResult, othersResult, categoriesResult, brandRow] =
      await Promise.all([
        draftsQ,
        othersQ,
        categoriesResultPromise,
        brandRowPromise,
      ]);

    const drafts = (draftsResult.data ?? []) as ArticleRow[];
    const others = (othersResult.data ?? []) as ArticleRow[];
    articles = [...drafts, ...others].slice(0, PAGE_LIMIT);
    total = (draftsResult.count ?? drafts.length) + (othersResult.count ?? others.length);
    categoriesResultPromise = Promise.resolve(categoriesResult) as never;
    brandRowPromise = Promise.resolve(brandRow) as never;
  }
  const categoriesResult = await categoriesResultPromise;
  const brandRow = await brandRowPromise;
  const knownCategories = Array.from(
    new Set(
      (categoriesResult.data ?? [])
        .map((r) => (r.category as string | null)?.trim())
        .filter((s): s is string => !!s),
    ),
  ).sort();
  const defaultSitemap = brandRow.data?.sitemap_url ?? "";

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
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <Th>Title</Th>
                  <Th>Category</Th>
                  <Th>Author</Th>
                  <Th align="right">Published</Th>
                  <Th align="right">Words</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {articles.map((a) => {
                  const rawStatus = (a.status as string | null) ?? "draft";
                  const status: ArticleStatus = isStatus(rawStatus)
                    ? (rawStatus as ArticleStatus)
                    : "draft";
                  const wordCount = (a.word_count as number | null) ?? 0;
                  const showFetch = status === "imported" && wordCount === 0;
                  return (
                    <tr
                      key={a.id as string}
                      className="border-t border-zinc-100"
                    >
                      <td className="px-4 py-3 align-top">
                        <Link
                          href={`${articleBase}/${a.slug}`}
                          className="block font-medium text-zinc-900 hover:underline"
                        >
                          {a.title as string}
                        </Link>
                        <span className="mt-0.5 block truncate text-xs text-zinc-500">
                          {a.slug as string}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        {a.category ? (
                          <span className="inline-flex items-center rounded bg-pink-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-pink-800">
                            {a.category as string}
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-zinc-700">
                        {(a.author as string | null) ?? (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right align-top text-zinc-700 tabular-nums">
                        {a.date_published ? (
                          new Date(
                            a.date_published as string,
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right align-top text-zinc-900 tabular-nums">
                        {wordCount > 0 ? (
                          wordCount.toLocaleString("en-US")
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {showFetch ? (
                          <FetchArticleButton
                            brandSlug={slug}
                            code={code}
                            articleId={a.id as string}
                          />
                        ) : (
                          <span
                            className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${STATUS_PILL[status]}`}
                          >
                            {STATUS_LABELS[status]}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`${align === "right" ? "text-right" : "text-left"} px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500`}
    >
      {children}
    </th>
  );
}
