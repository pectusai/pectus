import { requireUser } from "@/lib/auth";
import { getWorkspaceByCode } from "@/lib/workspace";
import { isAppActive } from "@/lib/apps";
import { ActivateAppPointer } from "@/app/components/ActivateAppPointer";
import {
  buildTree,
  annotateWithPages,
  type SitePlanNode,
  type Topic,
} from "@/lib/types/pages";
import { PageTreeView } from "./PageTreeView";
import { PlanActions } from "./PlanActions";

export default async function PagesScreen({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  if (!(await isAppActive("content-hub"))) {
    return <ActivateAppPointer appName="content-hub" surface="Pages" />;
  }
  const { supabase } = await requireUser();
  const ws = await getWorkspaceByCode(code);

  const defaultLocale = ws.default_locale ?? ws.locale ?? "en";
  const enabledLocales = ws.enabled_locales ?? [defaultLocale];
  const [{ data: nodes }, { data: pages }, { data: topics }] = await Promise.all([
    supabase
      .from("site_plan_nodes")
      .select("*")
      .eq("workspace_id", ws.id)
      .order("materialized_path", { ascending: true }),
    supabase
      .from("pages")
      .select("id, site_plan_node_id, status, page_variants(id, locale, status)")
      .eq("workspace_id", ws.id),
    supabase
      .from("topics")
      .select("*")
      .eq("workspace_id", ws.id)
      .is("dismissed_at", null)
      .order("name", { ascending: true }),
  ]);

  const nodeRows = (nodes ?? []) as SitePlanNode[];
  const tree = buildTree(nodeRows);

  const pageMap = new Map<
    string,
    {
      status: "draft" | "published";
      page_id: string;
      default_variant_id?: string;
      variants_by_locale?: Record<
        string,
        { variant_id: string; status: "draft" | "published" }
      >;
    }
  >();
  for (const p of pages ?? []) {
    if (!p.site_plan_node_id) continue;
    const variants = (p.page_variants ?? []) as Array<{
      id: string;
      locale: string;
      status: "draft" | "published";
    }>;
    const defaultVariant =
      variants.find((v) => v.locale === defaultLocale) ?? variants[0];
    const variants_by_locale: Record<
      string,
      { variant_id: string; status: "draft" | "published" }
    > = {};
    for (const v of variants) {
      variants_by_locale[v.locale] = { variant_id: v.id, status: v.status };
    }
    pageMap.set(p.site_plan_node_id, {
      status: p.status,
      page_id: p.id,
      default_variant_id: defaultVariant?.id,
      variants_by_locale,
    });
  }
  annotateWithPages(tree, pageMap);

  const topicRows = (topics ?? []) as Topic[];
  const unfulfilledTopics = topicRows.filter((t) => t.status === "unfulfilled");

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-semibold tracking-tight"
            title="Pages: structural pages of your site (home, pillars, landings, etc.). Different from Articles, which are blog-style timestamped posts. Pages can have children (3 levels deep)."
          >
            Pages
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Plan your site as a tree. Each node becomes a page you can build.
          </p>
        </div>
        <PlanActions
          workspaceCode={code}
          unfulfilledTopics={unfulfilledTopics.map((t) => ({
            id: t.id,
            name: t.name,
            intent: t.intent,
          }))}
        />
      </div>

      {nodeRows.length === 0 ? (
        <div className="mt-12 rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <h2 className="text-lg font-medium text-gray-900">
            No site plan yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
            Pick a topic from your last weekly analysis and we&apos;ll suggest a
            pillar with child pages. Or plan the whole site at once.
          </p>
          {topicRows.length === 0 ? (
            <p className="mt-6 text-xs text-gray-500">
              Run the weekly analysis on the dashboard first to surface topics
              you can plan around.
            </p>
          ) : (
            <p className="mt-6 text-xs text-gray-500">
              {unfulfilledTopics.length} unfulfilled{" "}
              {unfulfilledTopics.length === 1 ? "topic" : "topics"} ready to
              plan.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-8">
          <PageTreeView
            tree={tree}
            workspaceCode={code}
            enabledLocales={enabledLocales}
          />
        </div>
      )}
    </div>
  );
}
