import { defineMiddleware } from "astro:middleware";

type Redirect = {
  from_path: string;
  to_path: string;
  status: 301 | 302;
};
type RedirectsFile = { redirects: Redirect[] };

/* Build-time load of content/redirects.json. The publish pipeline commits
 * this file; if the user has never published, the glob returns nothing and
 * we serve no redirects. */
const redirectsModules = import.meta.glob<RedirectsFile>(
  "../content/redirects.json",
  { eager: true, import: "default" },
);
const REDIRECTS: Map<string, Redirect> = new Map();
for (const mod of Object.values(redirectsModules)) {
  for (const r of mod.redirects ?? []) {
    REDIRECTS.set(r.from_path, r);
  }
}

/* In production builds the `pectus-preview/*` route must not serve drafts —
 * it reads Supabase with the service-role key and would expose unpublished
 * content. Production preview is a v0.3 problem (signed tokens). For v0.2
 * the iframe builder runs against a dev content-insights on the user's machine. */
export const onRequest = defineMiddleware((context, next) => {
  if (
    import.meta.env.PROD &&
    context.url.pathname.startsWith("/pectus-preview/")
  ) {
    return new Response("Not found.", { status: 404 });
  }

  const hit =
    REDIRECTS.get(context.url.pathname) ??
    (context.url.pathname.endsWith("/")
      ? REDIRECTS.get(context.url.pathname.slice(0, -1))
      : REDIRECTS.get(`${context.url.pathname}/`));
  if (hit) {
    const target = new URL(hit.to_path, context.url);
    target.search = context.url.search;
    return context.redirect(target.pathname + target.search, hit.status);
  }

  return next();
});
