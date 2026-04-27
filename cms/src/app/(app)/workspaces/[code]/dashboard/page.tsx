import { createServerClient } from "@pectus/supabase";
import { getWorkspaceByCode } from "@/lib/workspace";
import { RunAnalysisButton } from "./RunAnalysisButton";

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

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const workspace = await getWorkspaceByCode(code);
  const supabase = await createServerClient();

  const currentWeek = isoWeekStart();

  const [
    { data: latest },
    { count: keywordCount },
    { count: articleCount },
  ] = await Promise.all([
    supabase
      .from("weekly_analyses")
      .select("week_start, status, analysis, generated_at")
      .eq("workspace_id", workspace.id)
      .order("week_start", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("keywords")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id),
    supabase
      .from("articles")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id),
  ]);

  const row = latest as LatestRow | null;
  const rawAnalysis =
    row?.status === "done" && row.analysis?.raw ? row.analysis.raw : null;

  return (
    <div className="space-y-10">
      <header className="border-b border-zinc-200 pb-8">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
          Week of {humanWeek(currentWeek)}
        </p>
        <h2 className="mt-2 text-2xl font-semibold">Dashboard</h2>
        <p className="mt-2 max-w-prose text-sm text-zinc-600">
          The weekly content plan. Click the button to run the analysis skill;
          the output below is whatever the most recent run produced.
        </p>

        <dl className="mt-6 grid grid-cols-2 gap-4 sm:max-w-md">
          <Stat value={keywordCount ?? 0} label="Keywords" />
          <Stat value={articleCount ?? 0} label="Articles" />
        </dl>

        <div className="mt-6">
          <RunAnalysisButton code={code} />
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

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-5 py-4">
      <dt className="text-xs uppercase tracking-widest text-zinc-500">
        {label}
      </dt>
      <dd className="mt-2 text-3xl font-semibold tabular-nums text-zinc-900">
        {value.toLocaleString()}
      </dd>
    </div>
  );
}
