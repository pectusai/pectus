# hub-template — Astro public site

The public-facing content hub the user can preview locally. Static output, perfect SEO/AEO/GEO out of the box, built from your Pectus articles.

## Run

```
cd hub-template
npm run sync-articles     # pull articles from your Supabase + cache images locally
npm run dev               # preview at http://localhost:4321
npm run build             # static output to dist/
```

In v1, `npm run dev` is the primary use — preview only. Production deploys come in v2.

## Configure

Everything user-configurable lives in `pectus.config.ts`:

- Site URL, name, description
- Org name, URL, logo
- Brand tokens (read from `brand/brand.json`, can override here)
- Nav links + footer columns
- Hero copy + CTA destination
- Article type tab labels
- Category intro template

## Structure (planned, populated in PR5)

```
hub-template/src/
├── pages/
│   ├── index.astro                  hub landing
│   ├── [slug]/index.astro           catch-all: article OR category
│   ├── [slug]/page/[n].astro        category pagination
│   ├── page/[n].astro               hub pagination
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

Light mode, neutral palette, content-first typography. No dark blocks, no decorative accents, no opinionated copy. Customize via `pectus.config.ts` and `brand/brand.json`.
