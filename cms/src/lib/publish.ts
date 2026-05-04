/* Publish pipeline — pure logic. No Supabase calls, no GitHub calls. The
 * orchestrating server action threads data in and writes results back.
 *
 * Responsibilities:
 *   - Build the page JSON committed to the user's repo.
 *   - Build the per-locale site-plan JSON from the project's adopted nodes.
 *   - Build the redirects JSON from the project's redirects rows.
 *   - Compute the redirect-chain-collapsed list when adding a new redirect.
 */

import type { ProjectUrlConfig } from "./page-url";
import { resolvePageUrl } from "./page-url";

export type PageJsonBlock = {
  type: string;
  props: Record<string, unknown>;
};

export type PageJson = {
  title: string;
  meta_description: string | null;
  template_id: string;
  purpose: string;
  locale: string;
  slug: string;
  url: string;
  blocks: PageJsonBlock[];
  published_at: string;
};

export function buildPageJson(args: {
  title: string;
  meta_description: string | null;
  template_id: string;
  purpose: string;
  locale: string;
  slug: string;
  url: string;
  blocks: PageJsonBlock[];
  published_at: string;
}): string {
  const payload: PageJson = args;
  return `${JSON.stringify(payload, null, 2)}\n`;
}

export type SitePlanRow = {
  node_id: string;
  parent_id: string | null;
  title: string;
  position: number;
  /** Materialized path of node ids, e.g. '/abc/def/'. */
  materialized_path: string;
  /** Resolved URL for this locale, or null if the variant isn't published. */
  url: string | null;
  status: "planned" | "draft" | "published";
};

export type SitePlan = {
  locale: string;
  generated_at: string;
  nodes: SitePlanRow[];
};

export function buildSitePlanJson(plan: SitePlan): string {
  return `${JSON.stringify(plan, null, 2)}\n`;
}

export type RedirectRow = {
  from_path: string;
  to_path: string;
  status: 301 | 302;
};

export function buildRedirectsJson(rows: RedirectRow[]): string {
  return `${JSON.stringify({ redirects: rows }, null, 2)}\n`;
}

/* Collapse a chain so that repeat slug renames don't create A→B→C; instead
 * the prior A→B is rewritten to A→C and the dangling B→C is dropped. Adds
 * the new from→to row. Removes any row whose from_path equals the new
 * to_path (those would be self-redirects after collapse).
 *
 * Pre: existing rows have unique from_path (enforced by the redirects table). */
export function collapseRedirects(
  existing: RedirectRow[],
  added: { from: string; to: string; status?: 301 | 302 },
): RedirectRow[] {
  if (added.from === added.to) return existing;

  const status = added.status ?? 301;
  const out: RedirectRow[] = [];

  for (const row of existing) {
    if (row.from_path === added.from) continue;
    if (row.from_path === added.to) continue;
    if (row.to_path === added.from) {
      out.push({ from_path: row.from_path, to_path: added.to, status: row.status });
      continue;
    }
    out.push(row);
  }
  out.push({ from_path: added.from, to_path: added.to, status });

  return out;
}

/* Convenience: resolve and return the URL for a variant given its node
 * ancestor slugs. Pure function delegating to page-url. */
export function variantUrl(args: {
  project: ProjectUrlConfig;
  locale: string;
  slug: string;
  ancestorSlugs: string[];
}): string {
  return resolvePageUrl(args);
}
