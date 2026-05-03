# Pectus install

> **A note for the human who downloaded this file.** You don't run these steps yourself. This file is the script Claude reads to install Pectus on your laptop. Open Claude Code in your install folder and tell it: "Read pectus.md and follow it." Claude greets you, asks for what it needs, and walks you through every step. You can stop reading here. The rest of this file is technical instructions written for Claude.

---

You are Claude Code. The user just downloaded this file because they want to wake Pectus up on their machine.

**Before you do anything else, print this welcome to them, verbatim. No commentary, no editorializing — just print the box, then the one-line greeting underneath, then wait.**

```
 ╭──────────────────────────────────────────────╮
 │                                              │
 │                                              │
 │                < pectus />                   │
 │                                              │
 │           creator insights kit               │
 │           self-hosted  ·  v0.2               │
 │                                              │
 │                                              │
 ╰──────────────────────────────────────────────╯
```

> Hi. I'm going to wake Pectus up on your laptop. About 20 to 30 minutes, mostly waiting on account signups. When I need something from you I'll tell you exactly what to click or paste. Ready?

Wait for them to say yes. Then walk them through the steps below in order. Don't skip steps. Don't reorder them. If a step fails, show the error exactly as it came back and stop — don't silently retry.

Speak to the user like a person who has installed maybe one or two dev tools before. Define jargon the first time it shows up. When you ask for a value, say what it looks like (e.g. "starts with `sk-ant-`"). When you point them at a console, tell them what they'll click once they're there.

---

## 1. Check prerequisites

Run:

```
which node npm npx git
```

You need Node.js 20+, npm 10+, and git. If any are missing, walk the user through installing them. macOS path: install Homebrew (`https://brew.sh`), then `brew install node git`. Verify with `node --version`.

## 2. Clone the upstream repo (or confirm an existing clone)

First, figure out whether the user already has the repo on disk.

Run `pwd` and `ls`. If the current folder contains `apps/`, `cms/`, `connectors/`, `skills/`, and a `package.json` that names `pectusai`, the user has already downloaded the Pectus code (most likely via the install page's git command, which lands the code and then opens Claude inside the folder). Do not download it again. Tell the user something like: "Looks like Pectus is already in this folder. I'll continue from here." Then quietly make sure the upstream link is set so future updates know where to pull from:

```
git remote get-url upstream || git remote add upstream https://github.com/pectusai/pectus.git
```

Move on to step 3.

Otherwise, you need to download Pectus. Before picking a folder, check whether the user already has a Pectus install elsewhere on their machine. Run:

```
ls ~/pectus 2>/dev/null && ls ~/pectus/cms 2>/dev/null
```

If `~/pectus` exists and contains a `cms/` folder, the user already has a Pectus install for a different brand. One Pectus install holds one brand's data, so this new install needs its own folder. Ask the user something like: "Looks like you already have Pectus set up at `~/pectus`. Each Pectus install holds one brand, so this one needs its own folder. What's the brand called? A short word like `acme` or `jesperastrom` works." Use what they give you as the folder name: `~/pectus-<their-word>`. Remember the path you land on; later steps reference it.

If `~/pectus` is empty or doesn't exist, the default `~/pectus` is fine. Either way, confirm the chosen path with the user. Explain in plain words what `~` means: it's their user folder (on a Mac, that's the folder named after them inside `Users/`), so `~/pectus` is a folder called `pectus` inside their user folder. Tell them they can change the folder name at the end of the line if they want.

```
git clone https://github.com/pectusai/pectus.git ~/pectus
cd ~/pectus
git remote add upstream https://github.com/pectusai/pectus.git
```

(Substitute the chosen path for `~/pectus` in all three lines if the user picked something else.)

If the target path already exists but is not a Pectus clone (no `apps/`, `cms/`, etc.), ask the user how to proceed. Do not overwrite.

## 3. Install dependencies

```
npm install
```

This installs across all workspaces (connectors, apps, cli, cms). Should complete in under 90 seconds on a normal connection.

## 4. Brand setup

```
npx pectus brand
```

The wizard's first prompt is **Manual** vs **Import from Claude Design**.

**Manual** walks through brand name, tagline, colors, voice and tonality, website URL, sitemap URL, logo upload (path or skip), font choices (system, Google, or upload). Plan for 10 to 15 minutes.

**Import from Claude Design** asks for a Claude Design URL (something like `https://api.anthropic.com/v1/design/h/...`). Pectus fetches the bundle, asks Claude to extract brand fields from the bundle's `tokens.css`, README, and chat transcript, and writes the result to `brand/brand.json`. The full unzipped bundle is saved to `brand/imports/<timestamp>/` so apps can re-read raw tokens later. Logo, image model, and website/sitemap URLs are not in the bundle and stay blank — fill them in later via the CMS Brand page.

Either way, the result lands at `brand/brand.json`. No external services touched yet.

Do not skip this step. The brand profile is the seed for everything downstream — the CMS, every installed app (including the pre-installed `content-hub`), and skills all read from `brand/brand.json`.

## 5. Register external accounts

Three services are required to boot Pectus. Two more are optional. Walk the user through each one in order. For each, give them the link, wait for them to sign up, then ask for the specific value Pectus needs. Write each value into `.env.local` as you receive it (use `.env.example` as the field reference).

**Required**

- **Supabase** — https://supabase.com. This is the database. After signup, head to https://supabase.com/dashboard/account/tokens and click "Generate new token". Paste it here. (You'll create the actual project in step 6.)
- **Anthropic** — https://console.anthropic.com. This is what powers Claude inside Pectus. After signup, click "API keys" in the sidebar, then "Create key". The value starts with `sk-ant-`. Paste it here.
- **Google Cloud** — https://console.cloud.google.com. This unlocks Google Analytics and Google Search Console data. There are four sub-steps inside the Google Cloud console; walk the user through them one at a time:
  1. Create a new project (top bar dropdown → "New Project"). Any name is fine.
  2. Enable two APIs: search for "Search Console API" → click Enable, then "Google Analytics Data API" → click Enable.
  3. Create an OAuth 2.0 client: APIs & Services → Credentials → "Create Credentials" → OAuth client ID → "Web application". Add `http://localhost:3000/auth/callback` as an authorized redirect URI.
  4. Copy the client ID and client secret. Paste both here.

**Optional (skippable)**

- **Vercel** — https://vercel.com. Only needed when the user is ready to publish their content-hub site to a public URL. Create a token at https://vercel.com/account/tokens. Skip if they're staying local-only for now.
- **GitHub** — https://github.com. Used by the publish flow to commit pages to a content-hub repo. Pectus will help set this up in step 9.

If the user wants to analyze ad spend later (Google Ads, Meta, LinkedIn), the LinkedIn Marketing Developer Platform application takes 1 to 3 weeks to be approved. Suggest they apply on day one at https://www.linkedin.com/developers — it doesn't block anything else, and it'll be ready when those connectors ship.

## 6. Provision Supabase

```
npx pectus connect supabase
```

This is the database setup. Using the access token from step 5, this command:
- Creates a new Supabase project (or attaches to an existing one — ask the user which they want). If this is the user's second-or-later Pectus install on the machine, create a *new* Supabase project for this brand. Each Pectus install needs its own database so brands stay isolated.
- Runs the migration files in `connectors/supabase/migrations/`. There are five today (numbered `0001_initial.sql` through `0005_brand_advanced_fields.sql`); each one creates or updates database tables.
- Asks for the email and password for the first admin user. This is the login the user will use in step 10. Tell them to put it in their password manager now.
- Writes four values to `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PROJECT_REF`.

If anything fails, surface the error exactly and stop. The most common cause is a typo in the access token — double-check it before retrying.

## 7. Connect Google (Search Console + Analytics)

```
npx pectus connect google
```

This pulls in Search Console and Google Analytics data. The user will need to do two things outside the terminal:

1. Create a service account in their Google Cloud project (the same project from step 5). Give it viewer access on the Search Console properties and the Analytics 4 properties they want Pectus to read.
2. Download the service account JSON file. Pectus will ask for the path to it.

Then back in the terminal, the command will ask which GSC site URL and which GA4 property to track. Pectus tests both connections before finishing — if either test fails, show the error and stop. The most common cause is the service account not having viewer access on the property; have them double-check the sharing settings in GSC and GA4.

## 8. Link Vercel and GitHub (optional)

```
npx pectus connect vercel
npx pectus connect github
```

Both are optional and can be done later. Skip Vercel if the user isn't ready to deploy a public hub yet. Skip GitHub if they don't have a content-hub repo set up — they can run `npx pectus connect github` from `~/pectus` any time later. The publish flow needs GitHub configured before pages can be committed; the rest of Pectus works fine without it.

## 9. Start the CMS

```
npm run dev
```

This boots the Next.js admin app at `http://localhost:3000`. The user signs in with the admin email and password they set in step 6. They'll land on an empty Workspaces view — that's expected; they create their first workspace in the next step.

If another Pectus is already running on port 3000 (the user has a different brand's install open), start this one on a different port:

```
PORT=3001 npm run dev
```

Then load `http://localhost:3001`. Tell the user which port their CMS is on so they can re-open the right one later.

## 10. Create the first workspace

```
npx pectus workspace create
```

A workspace is one market or audience segment. If the user only sells in one country, one workspace is enough. If they have separate sites for the UK, US, and Sweden, that's three workspaces. The wizard asks six questions:

1. **Market name** — a human label, e.g. "United Kingdom" or "DTC US".
2. **Code** — short kebab-case identifier, e.g. `uk` or `dtc-us`. Must be unique. Used in URLs.
3. **Locale** — the BCP-47 locale, e.g. `en-GB`, `en-US`, `sv-SE`.
4. **Site shape** — pick one:
    - **Greenfield**: Pectus runs the whole site. The hub mounts at `/`. Use this for new sites.
    - **Coexist**: Pectus pages live under a sub-path (default `/insights/`). Use this when the user already has a site and just wants to add a content section.
    The user can change this later in the CMS at Workspace Settings → Site URL.
5. **Content-hub GitHub repo** — `owner/name` of the repo where Publish will commit pages (e.g. `acme/acme-blog`). Optional at this step; they can fill it in later via Workspace Settings.
6. **Seed keywords** — 5 to 10 short phrases the workspace plans content around when there's no Search Console traffic yet (e.g. "best dtc skincare, retinol myths, sensitive skin routine"). Required for greenfield, optional for coexist. The dashboard's first analysis uses these as the starting topic spine.

The command creates the workspace row, sets a default review policy, and saves the seed keywords. The dashboard opens at `http://localhost:3000/workspaces/<code>`.

## 11. Run the first analysis

```
npx pectus analyze --workspace <code> --skill weekly-analysis
```

(Or have the user click "Run weekly analysis" on the dashboard — same effect.)

This runs the `weekly-analysis` skill. It gathers everything Pectus knows about the workspace (keywords, existing articles, the ICP, brand voice, knowledge insights) and asks Claude to produce a content plan: what to write next, ranked by projected traffic.

Wait for it to finish (typically 30 to 90 seconds). When it returns, summarize the result for the user in plain words: how many post suggestions came back, the top three topics by score, any of their existing posts the analysis flagged as rising. Then point them at the dashboard to read the full output.

## 12. Pectus is awake. Pick a door.

The CMS is running at `http://localhost:3000`, signed in as the admin from step 6. The first workspace exists. The first analysis has run. Pectus knows who they are, what they care about, and what data they have.

Now they choose what to do first. Present both doors clearly, then let them pick:

**Door A — Start producing with the bundled content-hub.**
Open the dashboard. The weekly analysis has ranked content opportunities by projected traffic. Pick one, click into the page builder, draft, publish. This is the fastest path to seeing Pectus do something useful, and it's where most users start.

**Door B — Teach Pectus a new trick.**
Pectus comes with content-publishing built in. If you want it to do something else (generate weekly LinkedIn posts, analyze a competitor's pricing, summarize customer reviews), you can teach it. Skip this for now and come back when you have a specific job in mind. When you do: run `npx pectus make-it skill` to write a new piece of logic, or `npx pectus make-it app` to add a new data source or a new place for Pectus to publish to.

Both doors can run in parallel. The choice is just "what do you want to try first."

Then, regardless of which door they pick, give them the operational basics in one tight list:

- **Re-open Pectus**: terminal → `cd <install path from step 2>` → `npm run dev` (or `PORT=3001 npm run dev` if you assigned a non-default port in step 9) → sign in with the email and password from step 6. If the user has multiple brands' Pectus installs on the machine, remind them which folder + port belongs to this brand.
- **Add your own data**: drop files (CSVs, BigQuery exports, audience research PDFs, anything) into `<install path>/knowledge/raw/`, then `npx pectus knowledge digest`. The digest turns the pile into structured insights every other skill consumes.
- **Pull updates**: `npx pectus update`. Rebases on upstream and runs new migrations. The skills and apps they've edited or written are not overwritten.
- **Something broke?**: `npx pectus doctor` checks env vars, reachability, config. Most "it broke" reports are a stale token; doctor catches that first.

That's it. They own the stack.
