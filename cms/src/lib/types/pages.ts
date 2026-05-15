/* TypeScript types matching the v0.2 data model.
 * cms/src/lib/types/pages.ts
 *
 * Mirrors connectors/supabase/migrations/0002_v0_2_pages.sql.
 */

import type { BlockType } from "@pectus/skills/edit-page/schema";
import type { PageBlock } from "@pectus/content-insights/blocks";

/* PageBlock is the runtime type used by templates/Astro renderer + edit-page
 * skill. BlockType comes from the Zod schema and represents the same shape
 * statically. They are kept in sync by hand. */
export type { PageBlock };

export type Intent =
  | "informational"
  | "commercial"
  | "transactional"
  | "navigational";

export type PagePurpose =
  | "home"
  | "content"
  | "landing"
  | "listing"
  | "contact"
  | "about";

export type PageTemplate = PagePurpose | "pillar";

export type ProjectMode = "seed" | "live";

export type Project = {
  id: string;
  name: string;
  code: string;
  locale: string;
  mode: ProjectMode;
  default_locale: string;
  enabled_locales: string[];
  default_locale_skips_prefix: boolean;
  mount_slug: string;
  content_insights_repo: string | null;
  content_insights_branch: string;
  created_at: string;
  updated_at: string;
};

export type Topic = {
  id: string;
  project_id: string;
  name: string;
  intent: Intent | null;
  source: "analysis-suggested" | "user";
  status: "unfulfilled" | "planned" | "published";
  dismissed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SitePlanNode = {
  id: string;
  project_id: string;
  parent_id: string | null;
  topic_id: string | null;
  title: string;
  intent: Intent | null;
  suggested_template: PageTemplate | null;
  suggested_purpose: PagePurpose | null;
  provenance: "plan-sitemap" | "user" | "suggested-followup";
  status: "suggested" | "adopted";
  materialized_path: string;
  position: number;
  rationale: string | null;
  created_at: string;
  updated_at: string;
};

export type LocaleVariantInfo = {
  variant_id: string;
  status: "draft" | "published";
};

export type SitePlanNodeWithChildren = SitePlanNode & {
  children: SitePlanNodeWithChildren[];
  depth: number;
  has_page: boolean;
  page_status?: "draft" | "published";
  page_id?: string;
  default_variant_id?: string;
  /** locale → variant info; populated when has_page. */
  variants_by_locale?: Record<string, LocaleVariantInfo>;
};

export type Redirect = {
  id: string;
  project_id: string;
  from_path: string;
  to_path: string;
  status: 301 | 302;
  source: "slug-rename" | "tree-move" | "page-delete" | "manual";
  created_at: string;
};

export type Page = {
  id: string;
  project_id: string;
  site_plan_node_id: string | null;
  template_id: PageTemplate;
  purpose: PagePurpose;
  status: "draft" | "published";
  mount_slug_at_publish: string | null;
  created_at: string;
  updated_at: string;
};

export type PageVariant = {
  id: string;
  page_id: string;
  locale: string;
  slug: string;
  title: string;
  meta_description: string | null;
  blocks: BlockType[];
  status: "draft" | "published";
  published_at: string | null;
  draft_updated_at: string;
};

export type PageDraft = {
  page_variant_id: string;
  blocks: BlockType[];
  saved_at: string;
};

export type SeedKeyword = {
  id: string;
  project_id: string;
  keyword: string;
  created_at: string;
};

export type { BlockType };

/* ------------------------------------------------------------------------- *
 * Tree helpers — pure, used by the Pages surface
 * ------------------------------------------------------------------------- */

/** Convert a flat node list into a tree of children. */
export function buildTree(nodes: SitePlanNode[]): SitePlanNodeWithChildren[] {
  const byId = new Map<string, SitePlanNodeWithChildren>();
  for (const n of nodes) {
    byId.set(n.id, { ...n, children: [], depth: 0, has_page: false });
  }
  const roots: SitePlanNodeWithChildren[] = [];
  for (const n of byId.values()) {
    if (n.parent_id && byId.has(n.parent_id)) {
      const parent = byId.get(n.parent_id)!;
      parent.children.push(n);
      n.depth = parent.depth + 1;
    } else {
      roots.push(n);
    }
  }
  /* Sort siblings by position. */
  const sortRec = (list: SitePlanNodeWithChildren[]) => {
    list.sort((a, b) => a.position - b.position || a.title.localeCompare(b.title));
    list.forEach((c) => sortRec(c.children));
  };
  sortRec(roots);
  return roots;
}

/** Annotate a tree with which nodes have a corresponding page. */
export function annotateWithPages(
  tree: SitePlanNodeWithChildren[],
  pagesByNodeId: Map<
    string,
    {
      status: "draft" | "published";
      page_id: string;
      default_variant_id?: string;
      variants_by_locale?: Record<string, LocaleVariantInfo>;
    }
  >,
): SitePlanNodeWithChildren[] {
  const walk = (n: SitePlanNodeWithChildren) => {
    const page = pagesByNodeId.get(n.id);
    n.has_page = Boolean(page);
    n.page_status = page?.status;
    n.page_id = page?.page_id;
    n.default_variant_id = page?.default_variant_id;
    n.variants_by_locale = page?.variants_by_locale;
    n.children.forEach(walk);
  };
  tree.forEach(walk);
  return tree;
}
