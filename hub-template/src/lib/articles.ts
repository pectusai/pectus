/**
 * Single source of truth for the public hub dataset.
 *
 * articles.json is populated by `npm run sync-articles`, which pulls from
 * the user's Supabase `articles` table. The shape matches whatever the
 * legacy parser produced and what the schema.ts builders expect.
 */
import raw from "~/data/articles.json";

export type Block =
  | { type: "p" | "h2" | "h3" | "h4"; text: string }
  | { type: "ul" | "ol"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "image"; src: string; alt?: string };

export type Article = {
  slug: string;
  title: string;
  description: string;
  heroImage: string;
  category: string;
  author: string;
  authorImage: string | null;
  datePublished: string;
  dateModified: string;
  readTime: string;
  wordCount: number;
  blocks: Block[];
};

export const ARTICLES: Article[] = (raw as Article[]) ?? [];
export const TOTAL = ARTICLES.length;
export const BY_SLUG: Record<string, Article> = Object.fromEntries(
  ARTICLES.map((a) => [a.slug, a]),
);

export type Category = { label: string; slug: string; count: number };

export function categorySlug(label: string): string {
  return label
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const countMap = new Map<string, number>();
for (const a of ARTICLES) {
  countMap.set(a.category, (countMap.get(a.category) || 0) + 1);
}
export const CATEGORIES: Category[] = [...countMap.entries()]
  .sort((a, b) => b[1] - a[1])
  .map(([label, count]) => ({ label, slug: categorySlug(label), count }));

export const CATEGORY_BY_SLUG: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, c]),
);

for (const a of ARTICLES) {
  if (CATEGORY_BY_SLUG[a.slug]) {
    // eslint-disable-next-line no-console
    console.warn(
      `[articles] slug "${a.slug}" collides with category slug — article takes priority.`,
    );
  }
}

export const PAGE_SIZE = 9;

export function paginate<T>(items: T[], page: number, size = PAGE_SIZE) {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * size;
  return {
    items: items.slice(start, start + size),
    page: safePage,
    pageCount,
    total,
    hasPrev: safePage > 1,
    hasNext: safePage < pageCount,
  };
}

export function articlesInCategory(categoryLabel: string): Article[] {
  return ARTICLES.filter((a) => a.category === categoryLabel);
}

export function relatedArticles(slug: string, category: string, n = 3): Article[] {
  const sameCat = ARTICLES.filter((a) => a.category === category && a.slug !== slug);
  if (sameCat.length >= n) return sameCat.slice(0, n);
  const out = [...sameCat];
  for (const a of ARTICLES) {
    if (out.length >= n) break;
    if (a.slug === slug) continue;
    if (out.some((x) => x.slug === a.slug)) continue;
    out.push(a);
  }
  return out;
}
