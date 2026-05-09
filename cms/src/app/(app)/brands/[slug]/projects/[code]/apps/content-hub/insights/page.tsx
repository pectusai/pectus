import { createServerClient } from "@pectus/supabase";
import { getProjectByCode } from "@/lib/project";
import { getBrandBySlug } from "@/lib/active-brand";
import { isAppActiveForProject } from "@/lib/apps";
import type {
  AnalysisStage1,
  AnalysisStage2,
  PostSuggestion,
} from "@/lib/insights/schemas";
import { RunAnalysisButton } from "./RunAnalysisButton";
import { RenewButton } from "./RenewButton";
import { IdeaCard } from "./IdeaCard";
import { DataSummary } from "./DataSummary";

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

type GenerationRow = {
  id: string;
  generated_at: string;
  ideas: AnalysisStage2 | null;
};

type DismissalRow = {
  generation_id: string;
  post_index: number;
};

type CardRecord = {
  generationId: string;
  postIndex: number;
  post: PostSuggestion;
  isNew: boolean;
};

function buildCards(
  generations: GenerationRow[],
  dismissals: DismissalRow[],
): { cards: CardRecord[]; latestTrafficTable: AnalysisStage2["suggested_articles_by_traffic"] | null; latestGeneratedAt: string | null } {
  if (generations.length === 0) {
    return { cards: [], latestTrafficTable: null, latestGeneratedAt: null };
  }
  const dismissed = new Set(
    dismissals.map((d) => `${d.generation_id}:${d.post_index}`),
  );
  const sorted = [...generations].sort(
    (a, b) =>
      new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime(),
  );
  const latestGenId = sorted[0].id;
  const latestGeneratedAt = sorted[0].generated_at;
  const latestTrafficTable =
    sorted[0].ideas?.suggested_articles_by_traffic ?? null;

  const cards: CardRecord[] = [];
  const seenTitles = new Set<string>();
  for (const g of sorted) {
    if (!g.ideas?.post_suggestions) continue;
    g.ideas.post_suggestions.forEach((post, idx) => {
      if (dismissed.has(`${g.id}:${idx}`)) return;
      if (seenTitles.has(post.title.toLowerCase())) return;
      seenTitles.add(post.title.toLowerCase());
      cards.push({
        generationId: g.id,
        postIndex: idx,
        post,
        isNew: g.id === latestGenId,
      });
    });
  }
  return { cards, latestTrafficTable, latestGeneratedAt };
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
        .select("id, interpreted_at, interpretation")
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
  const interpretationRow = latestInterpretation.data as
    | { id: string; interpreted_at: string; interpretation: AnalysisStage1 }
    | null;

  let cards: CardRecord[] = [];
  let latestTrafficTable: AnalysisStage2["suggested_articles_by_traffic"] | null =
    null;
  let latestGeneratedAt: string | null = null;

  if (interpretationRow) {
    const [genRows, dismissalRows] = await Promise.all([
      supabase
        .from("idea_generations")
        .select("id, generated_at, ideas")
        .eq("interpretation_id", interpretationRow.id)
        .eq("status", "done"),
      supabase
        .from("idea_post_dismissals")
        .select("generation_id, post_index")
        .eq("project_id", project.id),
    ]);
    const built = buildCards(
      (genRows.data ?? []) as GenerationRow[],
      (dismissalRows.data ?? []) as DismissalRow[],
    );
    cards = built.cards;
    latestTrafficTable = built.latestTrafficTable;
    latestGeneratedAt = built.latestGeneratedAt;
  }

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
          Console, and keyword data, finds the gaps in your existing content,
          and tells you what to write next.
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

      {noInputData ? (
        <section className="pectus-insights-section">
          <div className="pectus-insights-empty-card">
            <h2>No data to analyse yet.</h2>
            <p>
              Insights needs at least one of: keywords, GA4 traffic, or Search
              Console queries. Activate the inbound apps you have access to, or
              add some keywords under Project settings → Keywords.
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
          </div>
        </section>
      ) : !interpretationRow ? (
        <section className="pectus-insights-section">
          <div className="pectus-insights-empty-card">
            <h2>Ready when you are.</h2>
            <p>
              Click run, and Pectus snapshots your data, asks Claude Opus to
              read it, then asks Opus to produce five concrete article ideas
              you can draft from in one click.
            </p>
            <p className="pectus-insights-hero-meta">
              Takes 30 to 60 seconds. Costs roughly $0.30 in Claude tokens.
            </p>
            <RunAnalysisButton
              projectId={project.id}
              label="↻ Run first analysis"
            />
          </div>
        </section>
      ) : (
        <>
          <section className="mt-10">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-pink-600">
                  This week&apos;s ideas
                </span>
                <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-zinc-900">
                  {cards.length === 0
                    ? "All ideas dismissed."
                    : `${cards.length} idea${cards.length === 1 ? "" : "s"} in the queue.`}
                </h2>
                {latestGeneratedAt ? (
                  <p className="mt-1 text-xs text-zinc-500">
                    Last generated{" "}
                    {new Date(latestGeneratedAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                ) : null}
              </div>
              <RenewButton projectId={project.id} />
            </div>

            <div className="flex flex-col gap-3">
              {cards.length === 0 ? (
                <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
                  Nothing in the queue. Click Renew to generate five fresh
                  angles from the same interpretation, or update your data and
                  run a full analysis.
                </div>
              ) : (
                cards.map((c) => (
                  <IdeaCard
                    key={`${c.generationId}:${c.postIndex}`}
                    idea={c.post}
                    generationId={c.generationId}
                    postIndex={c.postIndex}
                    isNew={c.isNew}
                    base={base}
                    projectId={project.id}
                  />
                ))
              )}
            </div>
          </section>

          {latestTrafficTable && latestTrafficTable.length > 0 ? (
            <section className="mt-12">
              <header className="mb-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-pink-600">
                  Traffic potential
                </span>
                <h2 className="mt-1.5 text-xl font-bold tracking-tight text-zinc-900">
                  Articles ranked by what they could pull in.
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-zinc-500">
                  From the most recent generation. Projected monthly sessions
                  if each ranks in the top five.
                </p>
              </header>
              <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
                <table className="w-full text-[13px]">
                  <thead className="bg-zinc-50">
                    <tr>
                      <th className="whitespace-nowrap px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        Topic
                      </th>
                      <th className="whitespace-nowrap px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        Primary keyword
                      </th>
                      <th className="whitespace-nowrap px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        Monthly visits
                      </th>
                      <th className="whitespace-nowrap px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        Why
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestTrafficTable.map((row, i) => (
                      <tr key={i} className="border-t border-zinc-100">
                        <td className="px-3 py-2.5 align-top font-medium text-zinc-900">
                          {row.topic}
                        </td>
                        <td className="px-3 py-2.5 align-top">
                          <span className="inline-flex items-center rounded bg-pink-100 px-1.5 py-0.5 text-[11px] font-semibold text-pink-800">
                            {row.primary_keyword}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right align-top tabular-nums font-semibold text-zinc-900">
                          {row.projected_monthly_traffic.toLocaleString("en-US")}
                        </td>
                        <td className="px-3 py-2.5 align-top text-zinc-600">
                          {row.reasoning}
                        </td>
                      </tr>
                  ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          <DataSummary
            interpretation={interpretationRow.interpretation}
            interpretedAt={interpretationRow.interpreted_at}
          />
        </>
      )}
    </div>
  );
}
