/* URL resolution for the publish pipeline.
 *
 * Single source of truth for "where will this page live?". Used by the
 * publish action, the redirect generator, and the site-plan JSON builder.
 *
 * URL stack: <mount-slug?>/<locale-prefix?>/<materialized-path?>/<slug>/
 *
 * - Mount slug omitted when the project is mounted at root ('/').
 * - Locale prefix omitted when default_locale_skips_prefix is true and the
 *   variant locale matches default_locale.
 * - Materialized path is empty for top-level nodes, otherwise '/' joined.
 *
 * Trailing slash is always present (matches the content-hub Astro config).
 */

export type ProjectUrlConfig = {
  mount_slug: string;
  default_locale: string;
  default_locale_skips_prefix: boolean;
};

export type NodeAncestor = {
  id: string;
  slug: string;
};

export type ResolvePageUrlArgs = {
  project: ProjectUrlConfig;
  locale: string;
  /** Variant slug — the leaf segment of the URL. */
  slug: string;
  /** Slugs of the variant's site_plan_node ancestors, root-first. Excludes the
   * variant's own slug (that's the leaf). Empty array for root-level pages. */
  ancestorSlugs: string[];
};

function trim(s: string): string {
  return s.replace(/^\/+|\/+$/g, "");
}

export function resolvePageUrl(args: ResolvePageUrlArgs): string {
  const segments: string[] = [];

  const mount = trim(args.project.mount_slug);
  if (mount) segments.push(mount);

  const skipPrefix =
    args.project.default_locale_skips_prefix &&
    args.locale === args.project.default_locale;
  if (!skipPrefix) segments.push(args.locale);

  for (const seg of args.ancestorSlugs) {
    const trimmed = trim(seg);
    if (trimmed) segments.push(trimmed);
  }

  const leaf = trim(args.slug);
  if (leaf) segments.push(leaf);

  return `/${segments.join("/")}${segments.length ? "/" : ""}`;
}

/** Path used inside the user's repo for a published page JSON file.
 * Mirrors the URL but rooted at content/pages/<locale>/. */
export function pageJsonPath(args: {
  locale: string;
  ancestorSlugs: string[];
  slug: string;
}): string {
  const parts = ["content", "pages", args.locale];
  for (const seg of args.ancestorSlugs) {
    const trimmed = trim(seg);
    if (trimmed) parts.push(trimmed);
  }
  parts.push(`${trim(args.slug)}.json`);
  return parts.join("/");
}
