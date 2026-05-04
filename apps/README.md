# Apps — installable surfaces

An app is a unit of capability that plugs into Pectus. Two flavors:

- **Inbound apps** bring data in (GA4, Google Ads, Meta, LinkedIn, GSC).
- **Outbound apps** publish things out (`content-hub`, WordPress, Storyblok, ecom storefronts).

Apps are not infrastructure. Infrastructure (Supabase, Anthropic API, OAuth) lives in `connectors/`. Apps consume connectors when they need to.

## The "core covers the app" property

When the runner invokes any app, it composes the system prompt as:

```
[1] Brand block       → voice, name, colors, tagline (from brand/brand.json)
[2] Project block   → ICP, market, locale, keywords (from active project)
[3] Knowledge block   → digested insights (from knowledge/insights.md)
[4] App block         → only "what to do", never "how to sound"
```

App authors write layer 4 in core-aware language. They never set tone, voice, or copy. The brand voice is already in scope from layer 1.

This is the rule that prevents apps from drifting into theming. Apps describe behavior; the core describes identity.

## Contract

Every app folder ships:

- `APP.md` — manifest with frontmatter (name, type, needs, inputs, outputs, config, schema). Body is the prompt body, written core-aware.
- `schema.ts` — Zod schema for structured output the runner validates.
- `provision.ts` (optional) — CLI-callable setup if the app has external API credentials.
- `README.md` — overview for the user.

## v1 apps

**Outbound (publishers):**
- `content-hub/` — pre-installed Astro publisher. The flagship "what Pectus can build for you" surface. Was previously a top-level `hub-template/`; now lives here as an app to demonstrate that the same pattern targets WordPress, Storyblok, etc.

**Inbound (data sources):**
- `gsc/` — Google Search Console organic performance. Auth shared with `connectors/google`. Wraps the existing API client in `connectors/google/gsc.ts`.
- `ga4/` — Google Analytics 4 web analytics. Auth shared with `connectors/google`.
- `google-ads/` — Google Ads paid search. Needs developer token plus the shared Google OAuth.
- `meta/` — Meta Marketing API for Facebook + Instagram paid social. App-specific auth via System User token.
- `linkedin/` — LinkedIn Marketing API. App-specific OAuth, requires Marketing Developer Platform approval.

## Where do community apps live

When `npx pectus app install <repo-url>` is implemented, third-party apps land in `apps/community/<name>/`. Official apps stay at the top level of `apps/`.

## Authoring a new app

Use the `make-it` skill (`npx pectus skill run make-it`). It walks you through the manifest, the core-context dependencies, the input and output shapes, and scaffolds the files. Then submit a PR to `github.com/pectusai/pectus` for an official app, or publish to your own GitHub repo for a community app.

See https://pectus.ai/docs/architecture for the apps model in depth.
