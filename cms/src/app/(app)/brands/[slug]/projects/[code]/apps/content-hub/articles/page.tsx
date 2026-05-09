import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getBrandBySlug } from "@/lib/active-brand";
import { isAppActiveForProject } from "@/lib/apps";
import { ActivateAppPointer } from "@/app/components/ActivateAppPointer";
import { notFound } from "next/navigation";
import { ImportForm } from "./ImportForm";

const STATUS_STYLES: Record<string, string> = {
  imported: "bg-zinc-100 text-zinc-700",
  draft: "bg-amber-50 text-amber-800",
  review: "bg-blue-50 text-blue-800",
  published: "bg-emerald-50 text-emerald-800",
  archived: "bg-zinc-100 text-zinc-500",
};

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string; code: string }>;
}) {
  const { slug, code } = await params;
  const { supabase } = await requireUser();
  const brand = await getBrandBySlug(slug);

  const { data: ws } = await supabase
    .from("projects")
    .select("*")
    .eq("brand_id", brand.id)
    .eq("code", code)
    .maybeSingle();
  if (!ws) notFound();
  if (!(await isAppActiveForProject(ws.id, "content-hub"))) {
    return <ActivateAppPointer appName="content-hub" surface="Articles" />;
  }

  const { data: articles } = await supabase
    .from("articles")
    .select("slug, title, category, date_published, word_count, status, source, hero_image, author")
    .eq("project_id", ws.id)
    .order("date_modified", { ascending: false, nullsFirst: false })
    .limit(200);

  const { data: brandRow } = await supabase
    .from("brands")
    .select("sitemap_url")
    .eq("slug", slug)
    .maybeSingle();

  const defaultSitemap = brandRow?.sitemap_url ?? "";
  const list = articles ?? [];
  const articleBase = `/brands/${slug}/projects/${code}/apps/content-hub/articles`;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Articles</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Write new articles, edit existing ones, and import what&apos;s already
            on your site so the analysis knows what you&apos;ve covered.
          </p>
        </div>
        <Link
          href={`${articleBase}/new`}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          New article
        </Link>
      </div>

      <details className="mt-6 rounded-lg border border-zinc-200 bg-white p-5">
        <summary className="cursor-pointer text-sm font-semibold">
          Import from your existing site
        </summary>
        <p className="mt-2 text-sm text-zinc-600">
          Pectus reads your sitemap, fetches each URL, parses the HTML, and
          upserts into your articles table. Imported articles are reference
          material the weekly analysis reads to know what you&apos;ve already
          covered. Re-running is safe; articles are matched on slug.
        </p>
        <div className="mt-4">
          <ImportForm projectCode={code} defaultSitemap={defaultSitemap} />
        </div>
      </details>

      <section className="mt-10">
        <h2 className="text-base font-semibold">
          {list.length} {list.length === 1 ? "article" : "articles"}
        </h2>
        {list.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">
            No articles yet. Click <strong>New article</strong> above to draft one,
            or open the importer to pull in your existing site.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
            {list.map((a) => {
              const status = (a.status as string | null) ?? "draft";
              return (
                <li key={a.slug} className="flex items-center gap-3 p-3">
                  {a.hero_image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={a.hero_image}
                      alt=""
                      className="h-12 w-20 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="h-12 w-20 shrink-0 rounded bg-zinc-100" />
                  )}
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`${articleBase}/${a.slug}`}
                      className="block truncate font-medium hover:underline"
                    >
                      {a.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {a.category ? `${a.category} · ` : ""}
                      {a.author ? `${a.author} · ` : ""}
                      {a.date_published?.slice(0, 10) ?? "no date"} ·{" "}
                      {a.word_count ?? 0} words
                    </p>
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[status] ?? STATUS_STYLES.draft}`}
                  >
                    {status}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
