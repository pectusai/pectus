import { createServerClient } from "@pectus/supabase";
import { getWorkspaceByCode } from "@/lib/workspace";
import { isAppActive } from "@/lib/apps";
import { RunAnalysisButton } from "./RunAnalysisButton";
import { RefreshInsightsButton } from "./RefreshInsightsButton";
import { SetupChecklist, type ChecklistItem } from "./SetupChecklist";

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
    { count: analysisCount },
    { data: icp },
    { data: googleIntegration },
    { data: brand },
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
    supabase
      .from("weekly_analyses")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id),
    supabase
      .from("icp_profiles")
      .select("personas")
      .eq("workspace_id", workspace.id)
      .maybeSingle(),
    supabase
      .from("integrations")
      .select("provider")
      .eq("provider", "google")
      .maybeSingle(),
    supabase.from("brand_profile").select("website_url, name").maybeSingle(),
  ]);

  const websiteUrl = (brand?.website_url as string | null) ?? "";
  const robotsTxtUrl = websiteUrl
    ? `${websiteUrl.replace(/\/$/, "")}/robots.txt`
    : "your-site.com/robots.txt";

  const personas = (icp?.personas as unknown[] | null) ?? [];
  const icpDone = personas.length > 0;
  const googleDone = !!googleIntegration;
  const articlesDone = (articleCount ?? 0) > 0;
  const keywordsDone = (keywordCount ?? 0) > 0;
  const analysisDone = (analysisCount ?? 0) > 0;
  const brandDone = !!(brand?.name && (brand.name as string).trim().length > 0);
  const contentHubActive = await isAppActive("content-hub");

  const checklist: ChecklistItem[] = [
    {
      id: "brand",
      title: "Fill in your brand profile",
      description:
        "Voice, colors, fonts, website URL. Every skill and app reads from this. If it's empty, your first content will sound generic.",
      done: brandDone,
      href: "/brand",
      cta: "Open Brand page",
    },
    {
      id: "content-hub",
      title: "Activate Content Hub",
      description:
        "Content Hub is the bundled app that turns your articles and pages into a static public site. Activating it turns on the Pages and Articles tabs for this workspace and unlocks the Publish flow.",
      done: contentHubActive,
      href: "/apps/content-hub",
      cta: contentHubActive ? "Re-configure for this workspace" : "Open Content Hub",
    },
    ...(contentHubActive
      ? [
          {
            id: "articles",
            title: "Import your existing content from your sitemap",
            description: websiteUrl
              ? `Pulls your existing pages into Pectus so it knows what you've already written. Find your sitemap link in ${robotsTxtUrl} (look for the line starting with "Sitemap:").`
              : "Pulls your existing pages into Pectus so it knows what you've already written. Find your sitemap link in your-site.com/robots.txt (look for the line starting with \"Sitemap:\"). Set your website URL on the Brand page first if it's blank.",
            done: articlesDone,
            href: `/workspaces/${code}/articles`,
            cta: "Open Articles page",
          } satisfies ChecklistItem,
        ]
      : []),
    {
      id: "keywords",
      title: "Add or refresh seed keywords",
      description:
        "5 to 10 short phrases the workspace plans content around. Already populated from the install wizard, but you can refine them now.",
      done: keywordsDone,
      href: `/workspaces/${code}/keywords`,
      cta: "Open Keywords page",
    },
    {
      id: "icp",
      title: "Describe your Ideal Customer Profile",
      description:
        "Personas, pain points, and notes about who you're writing for. The analysis skill uses this to score and rank suggestions.",
      done: icpDone,
      href: `/workspaces/${code}/icp`,
      cta: "Open ICP page",
    },
    {
      id: "google",
      title: "Connect Google Analytics + Search Console",
      description:
        "Lets Pectus read your traffic data and see which content is actually performing. The first analysis works without this, but it's much sharper with real data.",
      done: googleDone,
      command: "cd <install path> && npx pectus connect google",
    },
    {
      id: "analysis",
      title: "Run your first weekly analysis",
      description:
        "Once the steps above are in good shape, click 'Run weekly analysis' at the top of this page. The output ranks what to write next by projected traffic.",
      done: analysisDone,
    },
  ];

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

        <div className="mt-6 flex flex-wrap items-start gap-3">
          <RunAnalysisButton code={code} />
          <RefreshInsightsButton code={code} />
        </div>
      </header>

      <SetupChecklist items={checklist} workspaceCode={code} />

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
