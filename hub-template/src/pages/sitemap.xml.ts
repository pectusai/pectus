import type { APIRoute } from "astro";
import { ARTICLES, CATEGORIES } from "../lib/articles";
import { config } from "../../pectus.config";

export const GET: APIRoute = ({ site }) => {
  const base = (site ?? new URL(config.site.url)).href.replace(/\/$/, "");
  const today = new Date().toISOString().slice(0, 10);
  const urls: Array<{ loc: string; priority: string; lastmod?: string }> = [];

  urls.push({ loc: `${base}/`, priority: "1.0", lastmod: today });

  for (const cat of CATEGORIES) {
    urls.push({
      loc: `${base}/content-hub/${cat.slug}/`,
      priority: "0.8",
      lastmod: today,
    });
  }

  for (const a of ARTICLES) {
    urls.push({
      loc: `${base}/content-hub/${a.slug}/`,
      priority: "0.7",
      lastmod: (a.dateModified || a.datePublished).slice(0, 10),
    });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}<priority>${u.priority}</priority></url>`,
  )
  .join("\n")}
</urlset>
`;

  return new Response(xml, { headers: { "Content-Type": "application/xml" } });
};
