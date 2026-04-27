# Pectus install

You are Claude Code. The user has pasted this file because they want to install Pectus on their machine. Walk them through the steps below in order. Do not skip steps. Do not reorder steps. Surface errors verbatim and stop if anything fails — do not silently retry.

The user is going to register accounts on a few services and paste keys back to you. Be patient at each prompt. Estimated total time: 20 to 30 minutes, mostly waiting on signups.

---

## 1. Check prerequisites

Run:

```
which node npm npx git
```

You need Node.js 20+, npm 10+, and git. If any are missing, walk the user through installing them. macOS path: install Homebrew (`https://brew.sh`), then `brew install node git`. Verify with `node --version`.

## 2. Clone the upstream repo

Default location is `~/pectus`. Confirm the path with the user before cloning.

```
git clone https://github.com/pectusai/pectus.git ~/pectus
cd ~/pectus
git remote add upstream https://github.com/pectusai/pectus.git
```

If `~/pectus` already exists, ask the user how to proceed — do not overwrite.

## 3. Install dependencies

```
npm install
```

This installs across all workspaces (apps, cli, cms, hub-template). Should complete in under 90 seconds on a normal connection.

## 4. Brand setup

```
npx pectus brand
```

This prompts the user for: brand name, tagline, primary color, secondary color, voice and tonality (multiline), website URL, sitemap URL, logo upload (path or skip), font choices (system, Google, or upload). Writes `brand/brand.json`. No external services touched yet.

Do not skip this step. The brand profile is the seed for everything downstream — both the CMS and the hub-template read from `brand/brand.json` at build time.

## 5. Register external accounts

The user needs accounts on four services. For each, give them the link, wait for them to register, then ask for the value Pectus needs.

- **Supabase** — https://supabase.com. After signup, create an access token at https://supabase.com/dashboard/account/tokens. Paste it here. (We'll create the project itself in step 6.)
- **Anthropic** — https://console.anthropic.com. Create an API key. Paste here.
- **Google Cloud** — https://console.cloud.google.com. Create a project. Enable the Search Console API and the Google Analytics Data API. Create an OAuth 2.0 client (Web application). Set redirect URI to `http://localhost:3000/auth/callback`. Paste client ID and client secret here.
- **Vercel** (optional in v1) — https://vercel.com. Create a token at https://vercel.com/account/tokens. Skip if the user isn't deploying yet.

Write each value to `.env.local` as you receive it. Use `.env.example` as the field reference.

## 6. Provision Supabase

```
npx pectus connect supabase
```

This uses the Supabase access token from step 5 to:
- Create a new project (or attach to an existing one — ask the user).
- Run migrations from `apps/supabase/migrations/`.
- Create the first admin user (prompt for email + password).
- Write `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PROJECT_REF` to `.env.local`.

If creation fails, surface the error verbatim and stop.

## 7. Connect Google (GSC + GA4)

```
npx pectus connect google
```

Walks the user through:
- Uploading a Google service account JSON (created in their Google Cloud project, with viewer access on Search Console + Analytics properties).
- Selecting which GSC site URL to track per workspace.
- Selecting which GA4 property to track per workspace.

Tests both connections before finishing. If either test fails, surface the error and stop.

## 8. Link Vercel and GitHub (optional)

```
npx pectus connect vercel
npx pectus connect github
```

These are optional. Skip if the user isn't deploying or doesn't have a GitHub fork yet.

## 9. Start the CMS

```
npm run dev
```

Opens `http://localhost:3000`. Have the user sign in with the admin credentials from step 6. They should land on an empty Workspaces view.

## 10. Create the first workspace

```
npx pectus workspace create
```

Prompts for: market name (e.g. "United Kingdom"), code (e.g. "uk"), locale (e.g. "en-GB"). Creates the workspace row, sets up the default review policy, and opens the workspace dashboard at `http://localhost:3000/workspaces/uk`.

## 11. Run the first analysis

```
npx pectus analyze --workspace uk --skill weekly-analysis
```

Or have the user click the "Run weekly analysis" button on the dashboard. Either way, this calls the `weekly-analysis` skill, which gathers keywords, articles, ICP, and brand context, sends it to Claude, and writes the output to the dashboard.

Wait for it to complete (typically 30 to 90 seconds). Summarize the result for the user: number of post suggestions, top-ranked topics, any old posts identified as rising. Point them at the dashboard to dig in.

## 12. Done

Tell the user:
- Pectus is running at `http://localhost:3000`.
- Next time, just run `npm run dev` from `~/pectus`.
- To pull updates from upstream: `npx pectus update`.
- To add data to the knowledge layer: drop files into `~/pectus/knowledge/raw/`, then `npx pectus knowledge digest`.
- To check connection health any time: `npx pectus doctor`.

That's it. The user owns their stack from here.
