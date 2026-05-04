"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@pectus/supabase";
import { requireUser } from "@/lib/auth";
import { getTemplate } from "@pectus/content-hub/templates";

export async function createPage(args: {
  workspaceCode: string;
  nodeId: string;
  purpose: string;
  templateId: string;
}): Promise<{ ok: true; variantId: string } | { ok: false; error: string }> {
  await requireUser();
  const supabase = await createServerClient();

  const { data: ws } = await supabase
    .from("workspaces")
    .select("id, code, default_locale, locale")
    .eq("code", args.workspaceCode)
    .single();
  if (!ws) return { ok: false, error: "Workspace not found." };

  const { data: node } = await supabase
    .from("site_plan_nodes")
    .select("id, title, materialized_path")
    .eq("id", args.nodeId)
    .eq("workspace_id", ws.id)
    .single();
  if (!node) return { ok: false, error: "Tree node not found." };

  const template = getTemplate(args.templateId);
  if (!template)
    return { ok: false, error: `Unknown template: ${args.templateId}` };

  /* Insert page row. */
  const { data: page, error: pageErr } = await supabase
    .from("pages")
    .insert({
      workspace_id: ws.id,
      site_plan_node_id: node.id,
      template_id: template.id,
      purpose: args.purpose,
      status: "draft",
    })
    .select("id")
    .single();
  if (pageErr || !page) {
    return { ok: false, error: pageErr?.message ?? "Failed to create page." };
  }

  /* Insert default-locale variant. */
  const locale = ws.default_locale ?? ws.locale ?? "en";
  const slug = slugify(node.title);
  /* Pre-fill the hero block's title with the node title for convenience. */
  const initialBlocks = template.default_blocks.map((b) => {
    if (b.type === "hero" && b.props && typeof b.props === "object") {
      return { ...b, props: { ...b.props, title: node.title } };
    }
    return b;
  });

  const { data: variant, error: variantErr } = await supabase
    .from("page_variants")
    .insert({
      page_id: page.id,
      locale,
      slug,
      title: node.title,
      blocks: initialBlocks,
      status: "draft",
    })
    .select("id")
    .single();

  if (variantErr || !variant) {
    /* Roll back page row. */
    await supabase.from("pages").delete().eq("id", page.id);
    return {
      ok: false,
      error: variantErr?.message ?? "Failed to create page variant.",
    };
  }

  /* If this node anchors a topic, mark the topic as 'planned' so it
   * disappears from the unfulfilled list in PlanActions. */
  const { data: nodeWithTopic } = await supabase
    .from("site_plan_nodes")
    .select("topic_id")
    .eq("id", node.id)
    .single();
  if (nodeWithTopic?.topic_id) {
    await supabase
      .from("topics")
      .update({ status: "planned" })
      .eq("id", nodeWithTopic.topic_id);
  }

  redirect(`/workspaces/${args.workspaceCode}/pages/builder/${variant.id}`);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "untitled";
}
