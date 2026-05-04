---
name: content-hub
type: outbound
description: The bundled public-facing site. Static Astro build that renders your published articles and pages with brand-aware design.
version: 0.3.0
needs:
  project: [mount_slug]
config:
  - CONTENT_HUB_REPO_PER_PROJECT
  - CONTENT_HUB_BRANCH_PER_PROJECT
cms_surfaces:
  project_tabs:
    - { label: "Pages", href: "/pages" }
    - { label: "Articles", href: "/articles" }
  project_settings:
    - { label: "Site URL", href: "/settings/site-url" }
    - { label: "Redirects", href: "/settings/redirects" }
---

# content-hub outbound app

The bundled public site. Outbound apps publish content somewhere; the runner builds the Astro site from `articles` + `pages` rows, commits the result to the project's configured GitHub repo, and lets your deploy target (Vercel, Netlify, Pages) take it from there.

This app is **bundled with Pectus** so a fresh install has something visual to point at within minutes. It's still a regular app: in v0.3 it's an explicit activation rather than always-on, and future installs that don't want a public site can leave it off.

## CMS surfaces

When activated, content-hub registers these surfaces inside each configured project:

- `Pages` tab — the page builder (manual one-off content: about page, pricing, lead magnets).
- `Articles` tab — imported articles + the publish flow.
- Settings → Site URL — where the public site lives.
- Settings → Redirects — old-URL → new-URL rules baked into the build.

The Phase 1 registry is hardcoded; Phase 2 will read this manifest dynamically.

## How activation works

`/apps` shows content-hub with an Activate button. Clicking Activate runs a per-project setup wizard that captures site shape (Brand new vs Existing site), GitHub repo, mount slug, and default locale. The wizard writes one `app_config` row per project and an `activated_apps` row at install level.

## Configure (build-time)

Everything build-time-configurable still lives in `pectus.config.ts`: site name, nav, footer, hero copy, category labels. Per-project runtime config (repo, mount slug, locales) lives in the database from v0.3 onward.

## Run

```
cd apps/content-hub
npm run sync-articles
npm run dev
npm run build
```

In v0.3, `npm run dev` is the primary local use. Production publishes happen via the Publish flow in the CMS once content-hub is activated for a project.
