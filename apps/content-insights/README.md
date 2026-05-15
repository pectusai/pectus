# content-insights — Astro public site (pre-installed app)

The public-facing site app. Ships pre-installed so a brand new Pectus user gets something visual to point at within minutes of running the install. Static output, perfect SEO/AEO/GEO out of the box, built from your Pectus articles.

This is a first-party app, conceptually equal to `wordpress` or `storyblok` (planned). It just happens to be the one bundled with the initial download.

## Run

```
cd apps/content-insights
npm run sync-articles     # pull articles from your Supabase + cache images locally
npm run dev               # preview at http://localhost:4321
npm run build             # static output to dist/
```

In v1, `npm run dev` is the primary use — preview only. Production deploys come in v2.

## Configure

Everything user-configurable lives in `pectus.config.ts`:

- Site URL, name, description
- Org name, URL, logo
- Brand tokens (read from `brands/<slug>/brand.json` selected via `PECTUS_BRAND_SLUG` env, or the first brand dir found; can override here)
- Nav links + footer columns
- Hero copy + CTA destination
- Article type tab labels
- Category intro template

## Structure (planned, populated in PR5)

```
apps/content-insights/src/
├── pages/
│   ├── index.astro                  landing
│   ├── [slug]/index.astro           catch-all: article OR category
│   ├── [slug]/page/[n].astro        category pagination
│   ├── page/[n].astro               pagination
│   ├── sitemap.xml.ts
│   └── robots.txt
├── layouts/BaseLayout.astro         injects meta, OG, JSON-LD
├── lib/
│   ├── schema.ts                    Schema.org JSON-LD builders (lifted as-is)
│   └── articles.ts                  pagination + types
├── components/
│   ├── Nav.astro                    rebuilt for neutral default
│   ├── Footer.astro                 rebuilt for neutral default
│   ├── Hero.astro                   rebuilt for neutral default
│   ├── ArticleCard.astro            single light variant
│   ├── ArticleGrid.astro            lifted as-is
│   ├── BlockRenderer.astro          lifted as-is
│   ├── TableOfContents.astro        lifted as-is
│   └── Pagination.astro             lifted as-is
└── data/articles.json               populated from CMS via sync command
```

## Default design

Light mode, neutral palette, content-first typography. No dark blocks, no decorative accents, no opinionated copy. Customize via `pectus.config.ts` and `brands/<slug>/brand.json`.
