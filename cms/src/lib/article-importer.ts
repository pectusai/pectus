/**
 * Article importer. Reads a sitemap, fetches each URL, parses the HTML for
 * BlogPosting metadata + body blocks, upserts into the `articles` table.
 *
 * Strategy: prefer schema.org JSON-LD when present (Astro / Next blogs usually
 * emit it), fall back to OpenGraph + meta tags + DOM heuristics.
 */
import * as cheerio from "cheerio";

export type Block =
  | { type: "p" | "h2" | "h3" | "h4"; text: string }
  | { type: "ul" | "ol"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "image"; src: string; alt?: string };

export type ParsedArticle = {
  slug: string;
  title: string;
  description: string;
  hero_image: string;
  category: string;
  author: string;
  date_published: string;
  date_modified: string;
  word_count: number;
  read_time: string;
  blocks: Block[];
  source_url: string;
};

const UA = "Mozilla/5.0 (compatible; PectusBot/1.0; +https://pectus.ai)";

export async function fetchSitemapUrls(sitemapUrl: string): Promise<string[]> {
  const res = await fetch(sitemapUrl, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Sitemap fetch failed (${res.status})`);
  const xml = await res.text();
  const $ = cheerio.load(xml, { xmlMode: true });

  /* Sitemap index files contain <sitemap><loc>...</loc></sitemap> entries
   * pointing at child sitemaps. Recurse one level. */
  const childSitemaps = $("sitemap > loc")
    .map((_, el) => $(el).text().trim())
    .get();
  if (childSitemaps.length > 0) {
    const all: string[] = [];
    for (const child of childSitemaps.slice(0, 25)) {
      try {
        all.push(...(await fetchSitemapUrls(child)));
      } catch {
        /* skip broken child sitemaps */
      }
    }
    return all;
  }

  return $("url > loc, urlset > url > loc")
    .map((_, el) => $(el).text().trim())
    .get();
}

function metaContent($: cheerio.CheerioAPI, key: string): string {
  return (
    $(`meta[property="${key}"]`).attr("content") ??
    $(`meta[name="${key}"]`).attr("content") ??
    ""
  ).trim();
}

type LdJson = Record<string, unknown>;

function parseLdJson($: cheerio.CheerioAPI): LdJson {
  const scripts = $('script[type="application/ld+json"]').toArray();
  for (const script of scripts) {
    try {
      const txt = $(script).text();
      if (!txt.trim()) continue;
      const parsed = JSON.parse(txt) as unknown;
      const items: unknown[] = Array.isArray(parsed)
        ? parsed
        : typeof parsed === "object" && parsed !== null && "@graph" in parsed
          ? ((parsed as { "@graph": unknown[] })["@graph"] ?? [])
          : [parsed];
      for (const item of items) {
        if (typeof item !== "object" || item === null) continue;
        const t = (item as { "@type"?: string | string[] })["@type"];
        const types = Array.isArray(t) ? t : t ? [t] : [];
        if (types.some((x) => /BlogPosting|Article|NewsArticle/i.test(x))) {
          return item as LdJson;
        }
      }
    } catch {
      /* malformed JSON-LD — skip */
    }
  }
  return {};
}

function pickString(val: unknown): string {
  if (typeof val === "string") return val;
  if (val && typeof val === "object") {
    const v = val as { name?: string; url?: string };
    return v.name ?? v.url ?? "";
  }
  return "";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function htmlToBlocks($: cheerio.CheerioAPI, root: cheerio.Cheerio<any>, depth = 0): Block[] {
  if (depth > 4) return [];
  const blocks: Block[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (root as any).children().each((_: number, el: unknown) => {
    const node = el as unknown as { tagName?: string };
    const tag = node.tagName?.toLowerCase();
    if (!tag) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const $el = $(el as any);
    if (tag === "p") {
      const text = $el.text().trim();
      if (text) blocks.push({ type: "p", text });
    } else if (tag === "h2" || tag === "h3" || tag === "h4") {
      const text = $el.text().trim();
      if (text) blocks.push({ type: tag, text });
    } else if (tag === "ul" || tag === "ol") {
      const items = $el
        .find("> li")
        .map((_i, li) => $(li).text().trim())
        .get()
        .filter(Boolean);
      if (items.length > 0) blocks.push({ type: tag, items });
    } else if (tag === "blockquote") {
      const text = $el.text().trim();
      if (text) blocks.push({ type: "quote", text });
    } else if (tag === "figure") {
      const img = $el.find("img").first();
      if (img.length > 0) {
        const src = img.attr("src") ?? "";
        if (src) blocks.push({ type: "image", src, alt: img.attr("alt") });
      }
    } else if (tag === "img") {
      const src = $el.attr("src") ?? "";
      if (src) blocks.push({ type: "image", src, alt: $el.attr("alt") });
    } else if (
      tag === "section" ||
      tag === "div" ||
      tag === "article" ||
      tag === "main"
    ) {
      blocks.push(...htmlToBlocks($, $el, depth + 1));
    }
  });
  return blocks;
}

function slugFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.replace(/\/$/u, "").split("/").filter(Boolean);
    return parts[parts.length - 1] || "untitled";
  } catch {
    return "untitled";
  }
}

export async function parseArticle(url: string): Promise<ParsedArticle | null> {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) return null;
  const html = await res.text();
  const $ = cheerio.load(html);
  const ld = parseLdJson($);

  const title =
    pickString(ld.headline) ||
    metaContent($, "og:title") ||
    $("h1").first().text().trim();
  if (!title) return null;

  const description =
    pickString(ld.description) ||
    metaContent($, "og:description") ||
    metaContent($, "description");

  const heroImage =
    pickString(ld.image) ||
    metaContent($, "og:image") ||
    "";

  const datePublished =
    pickString(ld.datePublished) ||
    metaContent($, "article:published_time") ||
    new Date().toISOString();

  const dateModified =
    pickString(ld.dateModified) ||
    metaContent($, "article:modified_time") ||
    datePublished;

  const author =
    pickString(ld.author) ||
    metaContent($, "article:author") ||
    "";

  const category =
    pickString(ld.articleSection) ||
    metaContent($, "article:section") ||
    "Blog";

  const slug = slugFromUrl(url);

  /* Body parsing — find <article>, fall back to <main>, fall back to <body>. */
  const articleEl = $("article").first();
  const mainEl = $("main").first();
  const bodyRoot = articleEl.length > 0 ? articleEl : mainEl.length > 0 ? mainEl : $("body");
  const blocks = htmlToBlocks($, bodyRoot);

  const text = blocks
    .map((b) => {
      if ("text" in b) return b.text;
      if ("items" in b) return b.items.join(" ");
      return "";
    })
    .join(" ");
  const wordCount = text.split(/\s+/u).filter(Boolean).length;
  const readTime = `${Math.max(1, Math.ceil(wordCount / 220))} min read`;

  return {
    slug,
    title,
    description,
    hero_image: heroImage,
    category,
    author,
    date_published: datePublished,
    date_modified: dateModified,
    word_count: wordCount,
    read_time: readTime,
    blocks,
    source_url: url,
  };
}
