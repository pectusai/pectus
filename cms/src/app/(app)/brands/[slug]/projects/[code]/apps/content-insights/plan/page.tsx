import { createServerClient } from "@pectus/supabase";
import { getBrandBySlug } from "@/lib/active-brand";
import { notFound } from "next/navigation";
import { checkPrereqs } from "@/lib/prereqs";
import { NeedsCard } from "@/app/components/NeedsCard";
import { RunAnalysisButton } from "./RunAnalysisButton";
import { RefreshInsightsButton } from "./RefreshInsightsButton";

function isoWeekStart(d = new Date()): string {
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

function humanWeek(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

type LatestRow = {
  week_start: string;
  status: string;
  generated_at: string | null;
  analysis: { raw?: string } | null;
};

export default async function PlanPage({
  params,
}: {
  params: Promise<{ slug: string; code: string }>;
}) {
  const { slug, code } = await params;
  const brand = await getBrandBySlug(slug);
  const supabase = await createServerClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, code, locale")
    .eq("brand_id", brand.id)
    .eq("code", code)
    .maybeSingle();

  if (!project) notFound();

  const prereq = await checkPrereqs("site-plan", {
    brandId: brand.id,
    brandSlug: slug,
    projectId: project.id,
    projectCode: code,
  });
  if (!prereq.ok) {
    return (
      <NeedsCard
        title="Add keywords before running the plan"
        appContext="The weekly plan ranks topics by keyword opportunity. Without keywords, there's nothing to rank."
        missing={prereq.missing}
      />
    );
  }

  const currentWeek = isoWeekStart();

  const { data: latest } = await supabase
    .from("weekly_analyses")
    .select("week_start, status, analysis, generated_at")
    .eq("project_id", project.id)
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  const row = latest as LatestRow | null;
  const rawAnalysis =
    row?.status === "done" && row.analysis?.raw ? row.analysis.raw : null;

  return (
    <div className="space-y-10">
      <header className="border-b border-zinc-200 pb-8">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
          Week of {humanWeek(currentWeek)}
        </p>
        <h2 className="mt-2 text-2xl font-semibold">Content plan</h2>
        <p className="mt-2 max-w-prose text-sm text-zinc-600">
          The weekly content plan ranks what to write next based on keywords,
          ICP, and connected analytics. Run the analysis skill to refresh it.
        </p>
        <div className="mt-6 flex flex-wrap items-start gap-3">
          <RunAnalysisButton code={code} />
          <RefreshInsightsButton code={code} />
        </div>
      </header>

      <section>
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">Latest analysis</h3>
          {row?.generated_at ? (
            <p className="text-xs text-zinc-500">
              Generated {new Date(row.generated_at).toLocaleString()}
            </p>
          ) : null}
        </div>

        {rawAnalysis ? (
          <pre className="mt-3 max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-lg border border-zinc-200 bg-white p-4 text-sm leading-relaxed text-zinc-800">
            {rawAnalysis}
          </pre>
        ) : (
          <p className="mt-3 rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
            No analysis yet. Run one above.
          </p>
        )}
      </section>
    </div>
  );
}
