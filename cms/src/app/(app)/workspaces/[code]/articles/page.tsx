import { requireUser } from "@/lib/auth";
import { getWorkspaceByCode } from "@/lib/workspace";
import { ImportForm } from "./ImportForm";

export default async function Page({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const { supabase } = await requireUser();
  const ws = await getWorkspaceByCode(code);

  const { data: articles } = await supabase
    .from("articles")
    .select("slug, title, category, date_published, word_count, status, source")
    .eq("workspace_id", ws.id)
    .order("date_published", { ascending: false })
    .limit(200);

  /* Pre-fill the sitemap field with the brand's configured sitemap_url. */
  const { data: brand } = await supabase
    .from("brand_profile")
    .select("sitemap_url")
    .eq("singleton", true)
    .maybeSingle();

  const defaultSitemap = brand?.sitemap_url ?? "";
  const list = articles ?? [];

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Articles</h1>
      <p className="mt-1 text-sm text-gray-600">
        Imported article inventory. The dashboard analysis uses these to identify content
        gaps — articles you don&apos;t have yet that the data says you should.
      </p>

      <section className="mt-8 rounded-lg border border-gray-200 p-5">
        <h2 className="text-base font-semibold">Import from sitemap</h2>
        <p className="mt-1 text-sm text-gray-600">
          Pectus reads your sitemap, fetches each URL, parses the HTML for title /
          description / body / dates, and upserts into your articles table. Re-running is
          safe — articles are matched on slug.
        </p>
        <div className="mt-4">
          <ImportForm workspaceCode={code} defaultSitemap={defaultSitemap} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-base font-semibold">
          {list.length} {list.length === 1 ? "article" : "articles"}
        </h2>
        {list.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">
            No articles yet. Use the import above to populate from your existing site.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-200">
            {list.map((a) => (
              <li key={a.slug} className="py-3">
                <p className="font-medium">{a.title}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {a.category} · {a.date_published?.slice(0, 10)} · {a.word_count} words
                  {a.source ? (
                    <>
                      {" · "}
                      <a
                        href={a.source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        source
                      </a>
                    </>
                  ) : null}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
