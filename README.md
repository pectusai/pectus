# Pectus

```
                                  ╱
                            ╱╱
                       ╱╱        < pectus />
                  ╱╱
             ╱╱            open-source scaffolding for builders
        ╱╱
   ╱╱
```

Pectus is open-source scaffolding for web-based, single-tenant, data-driven apps. You drop a folder into `apps/` or `skills/`, declare what it produces or consumes, and it composes with everything else in the install. Build your own. Ship them to a peer. Pull updates without losing what you wrote.

It runs on the user's laptop or their own server. Their Supabase, their Anthropic key, their fork. No shared cloud. No telemetry. The reference suite (content + SEO) ships in the box, but the suite is not the product. The contract is.

Think WordPress, but the plugin layer is an AI-shaped ecosystem instead of a PHP one. We're early. The contract works. The community is at zero. That part is up to you.

## How an install is wired

```
                            YOUR INSTALL
   ┌─────────────────────────────────────────────────────────────┐
   │                                                             │
   │      ┌─── BRAND ───┐         ┌──── PROJECT ────┐            │
   │      │ voice       │         │ market, locale  │            │
   │      │ colors      │ ──────▶ │ ICP & personas  │            │
   │      │ fonts       │         │ keywords        │            │
   │      └─────────────┘         └─────────────────┘            │
   │                                       │                     │
   │              ┌────────────────────────┴──────┐              │
   │              ▼                               ▼              │
   │   ┌──── INBOUND APPS ────┐       ┌──── OUTBOUND APPS ────┐  │
   │   │ pull data IN         │       │ render surfaces       │  │
   │   │ to project tables    │       │ publish content       │  │
   │   │                      │       │                       │  │
   │   │  gsc                 │       │  content-hub          │  │
   │   │  ga4                 │       │  your-publisher       │  │
   │   │  seed-keywords       │       │  your-dashboard       │  │
   │   │  your-importer       │       │  your-poster          │  │
   │   └──────────┬───────────┘       └─────────▲─────────────┘  │
   │              │                             │                │
   │              ▼                             │                │
   │       ┌──────────────────────────────────────┐              │
   │       │              SKILLS                  │              │
   │       │  portable verbs that read inbound    │              │
   │       │  data and act on outbound surfaces   │              │
   │       │                                      │              │
   │       │  weekly-analysis, make-it,           │              │
   │       │  your-skill                          │              │
   │       └──────────────────────────────────────┘              │
   │                                                             │
   └─────────────────────────────────────────────────────────────┘
```

Four layers. Brand + Project hold identity and audience. Inbound apps fetch data and write it into project tables. Outbound apps own user surfaces and publish things. Skills are portable verbs that target whatever apps are activated.

## What an app looks like

An app is a folder under `apps/` with an `APP.md` declaring its shape. That's the contract:

```yaml
---
name: linkedin-poster
type: outbound
description: Drafts LinkedIn posts from articles. Renders a queue in the admin.
needs:
  - articles
  - brand_voice
config:
  - posting_schedule
  - linkedin_account_token
---

# Behavior

Reads from the articles table whenever a new draft hits status='published'.
Generates a LinkedIn-shaped variant using the project's voice and tonality.
Queues it in /apps/linkedin-poster/queue for the user to approve and post.
```

That's the whole declaration. Add `schema.ts` for any structured output you want validated, add Next.js routes if it's outbound, and you have a working app.

A skill is the same shape with `SKILL.md` instead. Skills declare which app outputs they read and which apps they write to. The runner figures out the wiring at runtime based on what's activated for the current project.

## What you can actually build today

Honest scope. Pectus is real but young.

**Works today:**
- Web apps that render inside the Pectus Next.js admin.
- Static sites published through the Astro pipeline (the `content-hub` model).
- Inbound connectors that write to project-scoped Postgres tables.
- Skills that call Claude or any other LLM/API and persist structured output.
- Multi-brand installs (one Pectus, many brands, each with own projects).

**Doesn't work today:**
- Mobile apps. Pectus is web.
- Multi-tenant SaaS. Pectus is single-user, single-org per install.
- Apps that need a different database. Postgres via Supabase is the substrate.
- Apps with their own auth model. Pectus owns auth.
- CLI agnosticism is theoretically supported (the contract is just files) but currently every reference app was built with Claude Code. Other agents should work; nobody's stress-tested it yet.

**Coming, not done:**
- A `pectus.dev` registry where community apps and skills can be discovered and installed by name.
- Stable contract guarantees across versions. Right now v0.4 → v0.5 may break community apps. The contract is small but moving.
- A test harness an app author can run to verify their app conforms before shipping.

## What ships in the box

Reference implementations. They exist to prove the contract works and to give a new install something to do on day one.

| What        | Type     | What it does                                                              |
|-------------|----------|---------------------------------------------------------------------------|
| content-hub | outbound | Astro publisher with SEO/AEO/GEO defaults. Drafts and publishes articles. |
| gsc         | inbound  | Google Search Console queries.                                            |
| ga4         | inbound  | Google Analytics 4 sessions and traffic.                                  |
| seed-keywords | inbound | Manually curated keyword lists.                                          |
| weekly-analysis | skill | Reads everything inbound, asks Claude for a content plan ranked by traffic. |
| make-it     | skill    | Scaffolds new apps and skills from a description.                         |

Drop new apps into `apps/`, new skills into `skills/`. Restart the dev server and they appear.

## Install

Pectus is installed by handing `pectus.md` to an AI coding agent. The agent walks the user through prerequisites, account signups, API keys, Supabase provisioning, and starting the dev server. No commands run by hand.

1. Install your AI CLI of choice. The reference path uses Claude Code: https://claude.com/claude-code
2. Download `pectus.md` from https://pectus.ai
3. Open the agent in an empty folder and tell it: "Read pectus.md and follow it."

Required accounts: Supabase + Anthropic. Optional: Vercel + GitHub (for publishing). Google Search Console + Analytics setup happens later, inside the CMS, only if you activate those apps.

Estimated time: 30 to 60 minutes, mostly waiting for account verifications.

## Build your own app

Open the agent in your install folder:

```
npx pectus make-it app
```

It asks what kind of app (inbound or outbound), what data it produces or consumes, scaffolds a working folder under `apps/` with `APP.md`, `schema.ts`, and any Next.js surfaces an outbound app needs. Same for skills:

```
npx pectus make-it skill
```

Or skip the wizard and write `APP.md` by hand. The contract is small enough.

## What's where

```
pectus/
├── pectus.md           Install script the AI agent reads
├── AGENTS.md           Rails for coding agents working in this repo
├── CHANGELOG.md        Release notes
├── connectors/         Infrastructure (Supabase, Anthropic, Vercel, GitHub, Google auth)
├── apps/               Inbound and outbound apps. Drop new ones in here.
├── skills/             Portable verbs that compose activated apps.
├── knowledge/          Your data lake. Drop files here, skills consume them.
├── brands/             Your brand profiles. One folder per brand.
├── cms/                Next.js admin UI at localhost:3000
└── cli/                The `pectus` command-line tool
```

## Updating

```
npx pectus update
```

Pulls the latest from upstream and runs new migrations. Your custom apps, skills, brands, and knowledge are never overwritten. Heads-up: while v0.4 stabilizes, contract changes can require small migrations in community apps. Watch the CHANGELOG when updating.

## The ecosystem play

Pectus is most useful when other people's apps run inside your install. The reference suite shows what's possible; the value compounds when the suite gets longer because people other than the maintainers added to it.

If you build something interesting:

- Publish it at https://pectus.dev (the directory of community apps and skills).
- Open a PR against https://github.com/pectusai/pectus if it should ship in the box.
- Tag it with a short README so other installs know what they're activating.

If you want to read other people's apps before writing yours, the bundled `apps/` folder is the start. Every reference app is structured the way a community app would be.

## License

MIT. Fork it, ship it, use it commercially.

```
                                                       ╱
                                                  ╱
              made for builders                ╱
                                          ╱
                                     ╱
                                ╱
                           ╱
```
