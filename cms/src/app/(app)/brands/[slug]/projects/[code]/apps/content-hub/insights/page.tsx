import { createServerClient } from "@pectus/supabase";
import { getProjectByCode } from "@/lib/project";
import { getBrandBySlug } from "@/lib/active-brand";
import { isAppActiveForProject } from "@/lib/apps";

export const dynamic = "force-dynamic";

function isoWeekStart(d: Date): Date {
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

function formatWeekOf(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function InsightsPage({
  params,
}: {
  params: Promise<{ slug: string; code: string }>;
}) {
  const { slug, code } = await params;
  const brand = await getBrandBySlug(slug);
  const project = await getProjectByCode(code);
  const supabase = await createServerClient();
  const base = `/brands/${slug}/projects/${code}`;

  const ga4Active = await isAppActiveForProject(project.id, "ga4");
  const gscActive = await isAppActiveForProject(project.id, "gsc");

  const [keywordCount, articleCount, atpCount, latestInterpretation] =
    await Promise.all([
      supabase
        .from("keywords")
        .select("id", { count: "exact", head: true })
        .eq("project_id", project.id),
      supabase
        .from("articles")
        .select("id", { count: "exact", head: true })
        .eq("project_id", project.id),
      supabase
        .from("answer_public_entries")
        .select("id", { count: "exact", head: true })
        .eq("project_id", project.id),
      supabase
        .from("data_interpretations")
        .select("id, interpreted_at, status")
        .eq("project_id", project.id)
        .eq("status", "done")
        .order("interpreted_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const counts = {
    keywords: keywordCount.count ?? 0,
    articles: articleCount.count ?? 0,
    atp: atpCount.count ?? 0,
  };

  const hasInterpretation = !!latestInterpretation.data;
  const weekOf = formatWeekOf(isoWeekStart(new Date()));

  const missingData =
    !ga4Active && !gscActive && counts.keywords === 0 && counts.articles === 0;

  return (
    <div className="pectus-insights">
      <header className="pectus-insights-header">
        <span className="pectus-insights-eyebrow">Week of {weekOf}</span>
        <h1>Insights</h1>
        <p className="pectus-insights-lede">
          {brand.name} → {project.name}. The smart CMS reads your GA4, Search
          Console, and keyword data, finds the gaps, and tells you what to
          write next.
        </p>

        <dl className="pectus-insights-counters">
          <div className="pectus-insights-counter">
            <dt>Keywords</dt>
            <dd>{counts.keywords.toLocaleString("en-US")}</dd>
          </div>
          <div className="pectus-insights-counter">
            <dt>Articles</dt>
            <dd>{counts.articles.toLocaleString("en-US")}</dd>
          </div>
          <div className="pectus-insights-counter">
            <dt>ATP entries</dt>
            <dd>{counts.atp.toLocaleString("en-US")}</dd>
          </div>
        </dl>
      </header>

      {missingData ? (
        <section className="pectus-insights-empty">
          <h2>Connect your data sources first.</h2>
          <p>
            Insights needs at least one of: keywords (manual or from Search
            Console), GA4 traffic data, or articles to analyse. Activate the
            inbound apps you have access to and import some keywords, then come
            back.
          </p>
          <div className="pectus-insights-empty-actions">
            <a className="pectus-insights-button-primary" href={`${base}/apps`}>
              Browse inbound apps
            </a>
            <a
              className="pectus-insights-button-secondary"
              href={`${base}/keywords`}
            >
              Add keywords →
            </a>
          </div>
        </section>
      ) : !hasInterpretation ? (
        <section className="pectus-insights-empty">
          <h2>No analysis run yet.</h2>
          <p>
            When you run the analysis, Pectus reads your keyword and traffic
            data, then asks Claude Opus to interpret it: which keywords are
            rising, which existing articles are quietly gaining traction, what
            content clusters could become pillar pages, what new categories are
            emerging, and what to skip. Then it produces five concrete article
            ideas you can draft from in one click.
          </p>
          <p className="pectus-insights-empty-meta">
            One run usually takes 30 to 45 seconds. Available on the next
            update.
          </p>
          <button
            type="button"
            disabled
            className="pectus-insights-button-primary"
            title="Wired up in the next push."
          >
            Run analysis
          </button>
        </section>
      ) : (
        <section className="pectus-insights-empty">
          <h2>Analysis ready, idea cards coming next push.</h2>
          <p>
            Latest interpretation:{" "}
            {new Date(
              latestInterpretation.data!.interpreted_at as string,
            ).toLocaleString("en-US")}
            . The cards, tables, and Renew button arrive in the next update.
          </p>
        </section>
      )}
    </div>
  );
}
