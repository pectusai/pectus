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
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const SAMPLE_IDEAS: Array<{
  title: string;
  angle: string;
  keyword: string;
  type: string;
  isNew: boolean;
}> = [
  {
    title: "Why your applicant tracking system feels slow at 50 employees",
    angle:
      "The exact six friction points that turn a stage-2 startup ATS into a hiring bottleneck — and the lightest possible fixes.",
    keyword: "applicant tracking system",
    type: "long form guide",
    isNew: true,
  },
  {
    title: "Greenhouse vs. Workable vs. Teamtailor for 50–200 employees",
    angle:
      "A side-by-side comparison aimed at the buying committee that already knows the category.",
    keyword: "greenhouse vs workable",
    type: "comparison",
    isNew: true,
  },
  {
    title: "How to write a job ad that actually filters",
    angle:
      "Templates and three-line tests for whether the ad is screening anyone in or just collecting clicks.",
    keyword: "job ad examples",
    type: "how to",
    isNew: false,
  },
];

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

  const [ga4Active, gscActive] = await Promise.all([
    isAppActiveForProject(project.id, "ga4"),
    isAppActiveForProject(project.id, "gsc"),
  ]);

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
  const noInputData =
    counts.keywords === 0 && counts.articles === 0 && !ga4Active && !gscActive;

  const weekOf = formatWeekOf(isoWeekStart(new Date()));

  return (
    <div className="pectus-insights">
      <header className="pectus-insights-header">
        <span className="pectus-insights-eyebrow">Week of {weekOf}</span>
        <h1>Insights</h1>
        <p className="pectus-insights-lede">
          {brand.name} · {project.name}. The smart CMS reads your GA4, Search
          Console, and keyword data to find the gaps in your existing content
          and tell you what to write next.
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

      <section className="pectus-insights-section">
        <div className="pectus-insights-section-head">
          <div>
            <span className="pectus-insights-eyebrow">This week&apos;s ideas</span>
            <h2 className="pectus-insights-section-title">
              {hasInterpretation
                ? "Ready to generate."
                : "Five article ideas, generated from your data."}
            </h2>
          </div>
        </div>

        <div className="pectus-insights-hero">
          {noInputData ? (
            <>
              <h2>No data to analyse yet.</h2>
              <p>
                Insights needs at least one of: keywords, GA4 traffic, or
                Search Console queries. Activate the inbound apps you have
                access to, or paste a keyword list under Project settings →
                Keywords.
              </p>
              <div className="pectus-insights-hero-actions">
                <a
                  className="pectus-insights-button-primary"
                  href={`${base}/apps`}
                >
                  Browse inbound apps →
                </a>
                <a
                  className="pectus-insights-button-secondary"
                  href={`${base}/keywords`}
                >
                  Add keywords
                </a>
              </div>
            </>
          ) : !hasInterpretation ? (
            <>
              <h2>Ready when you are.</h2>
              <p>
                Click run, and Pectus snapshots your data, asks Claude Opus 4.7
                to interpret it (rising keywords, gaps, clusters, categories
                worth claiming), then asks Opus to produce five concrete article
                ideas you can draft from in one click.
              </p>
              <p className="pectus-insights-hero-meta">
                One run takes 30 to 45 seconds. Costs ~$0.30 in Claude tokens.
                Wired up in the next update.
              </p>
              <div className="pectus-insights-hero-actions">
                <button
                  type="button"
                  disabled
                  className="pectus-insights-button-primary"
                  title="Wired up in the next push."
                >
                  ↻ Run first analysis
                </button>
              </div>
            </>
          ) : (
            <>
              <h2>Analysis is ready, idea cards land in the next push.</h2>
              <p>
                Latest interpretation:{" "}
                {new Date(
                  latestInterpretation.data!.interpreted_at as string,
                ).toLocaleString("en-US")}
                . The card grid, Renew button, dismissal, and traffic potential
                table arrive in the next update.
              </p>
            </>
          )}

          <div className="pectus-insights-pipeline">
            <div className="pectus-insights-pipeline-step">
              <span className="pectus-insights-pipeline-num">1</span>
              <span className="pectus-insights-pipeline-name">Snapshot</span>
              <span className="pectus-insights-pipeline-desc">
                Counts keywords, articles, ATP entries. If GA4 or Search Console
                are connected, fetches fresh impressions and traffic.
              </span>
            </div>
            <div className="pectus-insights-pipeline-step">
              <span className="pectus-insights-pipeline-num">2</span>
              <span className="pectus-insights-pipeline-name">Interpret</span>
              <span className="pectus-insights-pipeline-desc">
                Opus 4.7 reads the snapshot and outputs structured findings:
                rising keywords, posts gaining traffic, clusters, categories,
                negatives.
              </span>
            </div>
            <div className="pectus-insights-pipeline-step">
              <span className="pectus-insights-pipeline-num">3</span>
              <span className="pectus-insights-pipeline-name">Generate</span>
              <span className="pectus-insights-pipeline-desc">
                Opus 4.7 turns the findings into exactly five ranked post ideas.
                Renew swaps in five fresh angles whenever you want.
              </span>
            </div>
          </div>
        </div>

        {!hasInterpretation && !noInputData ? (
          <div className="pectus-insights-preview">
            <div className="pectus-insights-preview-label">
              Sample of what idea cards look like
            </div>
            <div className="pectus-insights-preview-grid">
              {SAMPLE_IDEAS.map((idea) => (
                <article
                  key={idea.title}
                  className="pectus-insights-idea-ghost"
                >
                  {idea.isNew ? (
                    <span className="pectus-insights-idea-ghost-new">NEW</span>
                  ) : null}
                  <div className="pectus-insights-idea-ghost-title">
                    {idea.title}
                  </div>
                  <p className="pectus-insights-idea-ghost-angle">
                    {idea.angle}
                  </p>
                  <div className="pectus-insights-idea-ghost-pills">
                    <span className="pectus-insights-idea-pill pectus-insights-idea-pill-kw">
                      {idea.keyword}
                    </span>
                    <span className="pectus-insights-idea-pill pectus-insights-idea-pill-type">
                      {idea.type}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
