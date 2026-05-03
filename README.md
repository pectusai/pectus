# Pectus

A self-hosted, open-source creator insights kit. Connect your site, your search data, and your audience research, and get back a weekly content plan ranked by projected traffic.

Pectus runs locally on your machine. You own your data, your fork, and your stack.

## What you get

- A dashboard that tells you what content to write next, ranked by projected traffic.
- A workspace per market (UK, DE, FR or whatever you sell into) with its own ICP, keywords, and analysis.
- A pre-installed Astro `content-hub` app with perfect SEO/AEO/GEO out of the box, ready to publish to.
- An apps system: installable surfaces for data sources (GA4, Google Ads, Meta, LinkedIn) and publishers (WordPress, Storyblok, content-hub). Anyone can build and share apps.
- A skills system: portable verbs (write a post, run weekly analysis, audit internal linking) that target any installed app. One skill, many targets.
- A knowledge folder where you drop your own data (AnswerThePublic exports, BigQuery dumps, anything) and Pectus turns it into insights your skills consume.

## Install

Pectus is installed via Claude Code on your local machine. You won't run a single command by hand — Claude reads `pectus.md` and walks you through everything: prerequisites, account signups, API keys, Supabase provisioning, the works.

1. Install Claude Code if you don't have it: https://claude.com/claude-code
2. Download `pectus.md` from https://pectus.ai
3. Open Claude Code in any folder and paste the contents of `pectus.md`

Estimated time: 20 to 30 minutes, mostly waiting for account signups.

## What's where

```
pectus/
├── pectus.md          The install script Claude Code reads
├── AGENTS.md          Rails for coding agents working in this repo
├── CHANGELOG.md       Release notes
├── connectors/        Infrastructure (Supabase, Anthropic, Vercel, GitHub, Google auth)
├── apps/              Installable surfaces (data sources, publishers — content-hub ships pre-installed)
├── skills/            Portable verbs (analysis, write-post, internal-linking, knowledge-digest, make-it)
├── knowledge/         Your data lake. Drop files here, skills consume them
├── brand/             Your brand profile (voice, colors, fonts, taglines)
├── cms/               The Next.js admin UI you run at localhost:3000
└── cli/               The `pectus` command-line tool
```

## Documentation

Full docs live at https://pectus.ai/docs:

- **Install walkthrough** — https://pectus.ai/docs/install
- **Architecture** — https://pectus.ai/docs/architecture
- **Skills spec** (how to author a skill) — https://pectus.ai/docs/skills-spec
- **Integrations** (GSC, GA4, Google Ads, Meta, LinkedIn) — https://pectus.ai/docs/integrations
- **Upgrading** — https://pectus.ai/docs/upgrading
- **FAQ** — https://pectus.ai/docs/faq

## Updating

```
npx pectus update
```

This pulls the latest from the upstream Pectus repo and runs any new migrations. New community skills land in your `skills/` folder. Your brand and knowledge folders are never overwritten.

## Community

- Skills authored at https://pectus.dev
- Source: https://github.com/pectusai/pectus
- Issues + discussions on GitHub

## License

MIT.
