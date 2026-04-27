import type { APIRoute } from "astro";
import { config } from "../../pectus.config";

export const GET: APIRoute = ({ site }) => {
  const base = (site ?? new URL(config.site.url)).href.replace(/\/$/, "");
  const body = `User-agent: *
Allow: /

Sitemap: ${base}/sitemap.xml
`;
  return new Response(body, { headers: { "Content-Type": "text/plain" } });
};
