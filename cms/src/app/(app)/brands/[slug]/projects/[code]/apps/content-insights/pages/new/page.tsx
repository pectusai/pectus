import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getProjectByCode } from "@/lib/project";
import { templates } from "@pectus/content-insights/templates";
import { CreatePageForm } from "./CreatePageForm";

export default async function CreatePage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ nodeId?: string }>;
}) {
  const { code } = await params;
  const { nodeId } = await searchParams;
  const { supabase } = await requireUser();
  const ws = await getProjectByCode(code);

  if (!nodeId) {
    /* No node — redirect back to Pages. PR11 supports planned-node creation
     * only. "Add page manually" enters from the Pages screen with a tree node
     * already added. */
    redirect(`/projects/${code}/apps/content-insights/pages`);
  }

  const { data: node } = await supabase
    .from("site_plan_nodes")
    .select("*")
    .eq("id", nodeId)
    .eq("project_id", ws.id)
    .single();

  if (!node) notFound();

  /* Block creation if a page already exists for this node. */
  const { data: existing } = await supabase
    .from("pages")
    .select("id")
    .eq("site_plan_node_id", node.id)
    .eq("project_id", ws.id)
    .maybeSingle();

  if (existing) {
    /* Find the default-locale variant and jump to builder. */
    const { data: variant } = await supabase
      .from("page_variants")
      .select("id")
      .eq("page_id", existing.id)
      .eq("locale", ws.default_locale ?? ws.locale)
      .maybeSingle();
    if (variant) {
      redirect(`/projects/${code}/apps/content-insights/pages/builder/${variant.id}`);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Create page</h1>
      <p className="mt-1 text-sm text-gray-600">
        Building <span className="font-medium">{node.title}</span>
        {node.rationale && (
          <span className="block text-xs text-gray-500 mt-0.5">
            {node.rationale}
          </span>
        )}
      </p>

      <div className="mt-8">
        <CreatePageForm
          projectCode={code}
          nodeId={node.id}
          suggestedPurpose={node.suggested_purpose ?? "content"}
          suggestedTemplate={node.suggested_template ?? "content"}
          templates={templates.map((t) => ({
            id: t.id,
            name: t.name,
            purpose: t.purpose,
            description: t.description,
            thumbnail: t.thumbnail,
          }))}
        />
      </div>
    </div>
  );
}
