# Pectus

A self-hosted, open-source content insights platform. Connect your site, your search data, and your audience research, and get back a weekly content plan ranked by projected traffic.

Pectus runs locally on your machine. You own your data, your fork, and your stack.

## What you get

- A dashboard that tells you what content to write next, ranked by projected traffic.
- A workspace per market (UK, DE, FR — or whatever you sell into) with its own ICP, keywords, and analysis.
- An Astro public hub template with perfect SEO/AEO/GEO out of the box.
- A skills system: dev-authored growth loops you pull into your repo via `git pull upstream`. New skill upstream means new capabilities downstream — no migrations, no rebuilds.
- Knowledge folder where you drop your own data (AnswerThePublic exports, BigQuery dumps, anything) and Pectus turns it into insights your skills consume.

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
├── CLAUDE.md          Rails — what Claude is allowed to do in this repo
├── apps/              Service connectors (Supabase, Google, Vercel, GitHub, Anthropic)
├── skills/            Growth loops (SEO strategy, JTBD, internal linking, weekly analysis, knowledge digest)
├── knowledge/         Your data lake — drop files here, skills consume them
├── brand/             Your brand profile (voice, colors, fonts, taglines)
├── cms/               The Next.js admin UI you run at localhost:3000
├── hub-template/      The Astro public site you can preview locally
├── cli/               The `pectus` command-line tool
└── docs/              Architecture, skills spec, upgrading guide
```

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
