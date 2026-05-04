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
 │         connector framework + UI             │
 │           self-hosted  ·  v0.4.2             │
 │                                              │
 │                                              │
 ╰──────────────────────────────────────────────╯
```

> Hi. I'm going to wake Pectus up on your laptop. Plan for 60 to 90 minutes total. About 90% of that is signing up for and verifying accounts (Supabase, Anthropic, Google Cloud, optionally Vercel and GitHub). The actual setup work between accounts is short. When I need something from you I'll tell you exactly what to click or paste.
>
> If you don't know what to do at any point — what something means, why I'm asking, whether your answer is good enough — just ask me like a friend. There are no dumb questions here. I'd rather pause and explain than have you click through something you weren't sure about.
>
> Ready?

Wait for them to say yes. Then walk them through the steps below in order. Don't skip steps. Don't reorder them. If a step fails, show the error exactly as it came back and stop. Don't silently retry.

**Critical rule: never advance to the next step unless EITHER (a) the current step is verifiably complete, with every sub-action done and every expected output confirmed, OR (b) the user has explicitly told you it's OK to move on.** Both paths are valid; one of them must hold. Don't decide on the user's behalf that something "can be dealt with later". Don't infer completion from context. If a step has multiple sub-actions, all of them have to land before you treat (a) as satisfied. If you're tempted to "circle back later" to anything in the current step, stop and ask the user instead. Optional sub-steps still need an explicit user call to skip; that call is theirs to make, not yours.

**Critical rule: every shell command you ask the user to run in their own terminal must `cd` into the install path first.** When you give the user a `!`-prefixed command (or otherwise tell them to type something into their own terminal), wrap it with `cd <install path> && ...`. Don't assume the user's terminal is already in the right folder; they may have opened a fresh shell, switched directories, or never been there. Use the install path the user picked in step 2 (default `~/pectus`, sometimes a brand-suffixed folder). Example: `cd ~/pectus && npx pectus project create`, not `npx pectus project create`.

Speak to the user like a person who has installed maybe one or two dev tools before. Define jargon the first time it shows up. When you ask for a value, say what it looks like (e.g. "starts with `sk-ant-`"). When you point them at a console, tell them what they'll click once they're there.

---

## 1. Check prerequisites

Run:

```
which node npm npx git
```

You need Node.js 20.19 or later, npm 10+, and git. The 20.19 floor is set by Vite (used inside the CMS build) and several other deps that need ≥20.18.1. If `node --version` reports anything below 20.19, install a newer Node before continuing — `npm install` will warn loudly otherwise and parts of the dev server can fail in non-obvious ways. macOS path: install Homebrew (`https://brew.sh`), then `brew install node git`. To pin a specific version, use `nvm install 20` and `nvm use 20`.

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

If `~/pectus` exists and contains a `cms/` folder, the user already has a Pectus install for a different brand. One Pectus install holds one brand's data, so this new install needs its own folder. Ask the user something like: "Looks like you already have Pectus set up at `~/pectus`. Each Pectus install holds one brand, so this one needs its own folder. What's the brand called? A short word like `acme` or `your-brand` works." Use what they give you as the folder name: `~/pectus-<their-word>`. Remember the path you land on; later steps reference it.

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

This installs across all projects (connectors, apps, cli, cms). Should complete in under 90 seconds on a normal connection.

## 4. Brand setup

This step writes `brands/<slug>/brand.json`, which is the seed for everything Pectus produces. (Pectus is multi-brand as of v0.4 — every brand lives under `brands/<its-slug>/`, and you can have several brands in one install.) We keep it light at install: just ask the user to describe their brand in their own words, then turn that description into `brand.json` directly. Do **not** run the full `npx pectus brand` wizard, and do **not** ask the user for a Claude Design URL here. That option is available later from the CMS Brand page once Pectus is running.

Open with a reassuring framing message so the user knows they're not expected to nail the brand in one shot. Say something like:

> "Heads up before we start: dialing in a brand description, system, and prompt that really sings takes a few days. That's normal. Pectus gives you tools all the way through, from tone of voice to camera settings to a full design system. We don't have to get it perfect now. Right now we're just giving Pectus a quick start so it has something to work from."

Then ask for a short description:

> "So tell me about the brand in your own words. The brand name and what you do, the voice you write in (warm? technical? dry? formal?), your main colors (hex codes if you have them, or descriptions like 'navy and burnt orange'), and your website URL. Anything else you want me to know is welcome. Two or three sentences is plenty. You'll polish everything from the Brand page once Pectus is running."

Wait for their description. Ask one or two follow-up questions if you're missing a name, primary color, or voice direction. Don't grill them. The point of this step is to write *something* sensible to disk, not to extract a complete brand strategy.

Pick a slug from the brand name (lowercase, hyphenated, ASCII-only — strip diacritics, replace whitespace and punctuation with hyphens, keep it under 80 chars). Confirm the slug back to the user before writing files. They can override it.

Create the directory `brands/<slug>/` and write `brands/<slug>/brand.json`. Fields to fill in from their description:

- `name`, `tagline`, `website_url`, `sitemap_url`
- `colors.accent`, `colors.surface`, `colors.text`, `colors.muted`, `colors.border` (use sensible defaults if they only gave you one or two colors; cream surface, dark text, gray muted, hairline border are safe)
- `voice` (one or two sentences in their own words)
- `tonality` (a short comma-separated list of adjectives if they gave you any)
- Leave `logo`, `fonts`, `radius`, `image_model`, `imported_from` at their defaults. They can change these from the CMS later.

After writing the file, summarize back to the user what you captured: "Brand name: X. Slug: Y. Voice: Z. Primary color: W. Anything I should change before we move on?" If they want corrections, edit and re-confirm.

Once they're happy, mention briefly: "If you want a richer design system later (full color palette, typography, component styles), open the Brand page in the CMS after install and import a Claude Design URL there. Skip that for now; we'll keep going."

## 5. Register external accounts

Three services are required to boot Pectus. Two more are optional. Walk the user through each one in order. For each, give them the link, wait for them to sign up, then ask for the specific value Pectus needs. Write each value into `.env.local` as you receive it (use `.env.example` as the field reference).

**Before you start asking, read `.env.local` if it exists.** For every variable that's already set to a non-empty value, do *not* ask the user to provide it again. Print one line per found variable, e.g. `Found NEXT_PUBLIC_SUPABASE_URL in .env.local — keeping.` (Mask secret-shaped values — show only the first 4 and last 4 characters, e.g. `eyJh…X9Yz`.) Then ask only for the values that are still missing. The user has likely been through the install before, or pasted the file directly; respect that. If a saved value turns out to be wrong later (verify step fails), tell the user which variable is suspect and ask for a replacement, but don't pre-emptively re-prompt for things that are already there.

**Required**

- **Supabase** — https://supabase.com. This is the database. The user creates the project themselves so they stay in control of the account. After signup, walk them through this:
  1. In the dashboard, click **New Project**. Pick an organization, name the project (anything, e.g. `pectus-<brand-slug>`), pick a region close to them, and set a database password (12+ characters, into the password manager now).
  2. Wait around 2 minutes for the project to provision.
  3. Open **Project Settings → API**. Three values to copy and paste back to you, one at a time:
     - **Project URL** (looks like `https://xyzabc.supabase.co`). On the first page of the API settings.
     - **anon (public) key** (a long string starting with `eyJ...`). Important: in the current Supabase UI the first page of API settings shows new "publishable" / "secret" keys that Pectus does not use. The `anon` and `service_role` keys live on a second tab (look for "Legacy API keys", "JWT-based keys", or similar). Tell the user explicitly: do not paste the first two keys they see on the landing tab; switch tabs first and look for the keys named `anon` and `service_role`.
     - **service_role (secret) key** (also starts with `eyJ...`, on the same second tab as `anon`, keep this one private).
  4. Open https://supabase.com/dashboard/account/tokens (a separate page from the project — it lives on the user's account, not inside the project). Click **Generate new token**, name it anything (e.g. `pectus`), copy the value (starts with `sbp_`). Pectus needs this to apply schema migrations and other Management-API operations on the user's behalf.
  Write all four into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ACCESS_TOKEN`. The first three are project-scoped; the access token is account-scoped and authenticates Pectus to the Supabase Management API.
- **Anthropic** — https://console.anthropic.com. This is what powers Claude inside Pectus. After signup, click "API keys" in the sidebar, then "Create key". The value starts with `sk-ant-`. Paste it here.
- **Google Cloud** — https://console.cloud.google.com. This unlocks Google Analytics and Google Search Console data. There are four sub-steps inside the Google Cloud console; walk the user through them one at a time:
  1. Create a new project (top bar dropdown → "New Project"). Any name is fine. Note that Google generates the project ID with a numeric or random suffix (e.g. a project named `acme-corp` becomes ID `acme-corp-412345`). The user can't change this; it's what shows up in service-account emails later.
  2. Enable **three** APIs. For each: APIs & Services → Library, search the name, click **Enable**, wait until the page flips to "API enabled". Don't skip any of these; missing the Admin API is what makes GA4 reject the service account with "this user doesn't exist" errors when the user later tries to add it under Property access management.
     - **Google Analytics Admin API** (lets the service account be recognized as a valid principal in GA4's user management UI)
     - **Google Analytics Data API** (lets Pectus read the actual GA4 report data)
     - **Google Search Console API** (reads Search Console performance data)
  3. Create an OAuth 2.0 client: APIs & Services → Credentials → "Create Credentials" → OAuth client ID → "Web application". Add `http://localhost:3000/auth/callback` as an authorized redirect URI. (Only `localhost` goes here. Don't add the user's public site domain. The OAuth handshake runs between Pectus on their laptop and Google. The public site is downstream and never participates in this flow.)
  4. Copy the client ID and client secret. Paste both here.

**Optional (skippable)**

- **Vercel** — https://vercel.com. Only needed when the user is ready to publish their content-hub site to a public URL. Create a token at https://vercel.com/account/tokens. Skip if they're staying local-only for now.
- **GitHub** — https://github.com. Used by the publish flow to commit pages to a content-hub repo. Pectus will help set this up in step 9.

If the user wants to analyze ad spend later (Google Ads, Meta, LinkedIn), the LinkedIn Marketing Developer Platform application takes 1 to 3 weeks to be approved. Suggest they apply on day one at https://www.linkedin.com/developers — it doesn't block anything else, and it'll be ready when those connectors ship.

## 6. Provision Supabase

Print this to the user verbatim before doing anything else in this step:

> Provision Supabase. This adds the Pectus database to your project and creates your admin login. Generating the SQL file now.

The user already created the project themselves in step 5 and the URL plus keys are in `.env.local`. Now we add the schema and create the admin login. **Do not run `npx pectus connect supabase`.** That command was built for an older flow that called the Supabase Management API. The supported flow now: you hand the user a SQL file they paste into Supabase's own SQL editor. The user keeps full control of their project.

### 6a. Confirm the migration file is on disk

As of v0.4.2, Pectus ships a single squashed migration at `connectors/supabase/migrations/0001_pectus_v04.sql`. There's no longer a build step — the user pastes that file directly. Verify it exists:

```
ls connectors/supabase/migrations/
```

You should see `0001_pectus_v04.sql` and nothing else. If there are stray older `0001_initial.sql` etc. files (from a previous v0.4.1 install lying around), delete them — they don't apply to v0.4.2 and the file the user pastes must be exactly the v0.4.2 baseline.

### 6b. Have the user reset and apply the schema in Supabase

If the user has any prior data in this Supabase project, the v0.4.2 migration won't apply cleanly on top of it (existing tables with old `workspace_id` columns will collide with new indexes referencing `project_id`). The plan is wipe-and-reinstall. Walk them through it:

> "Open your Supabase project in the dashboard. In the left sidebar click **SQL Editor**, then **New query**. The editor often has placeholder code in it; select all (Cmd-A on Mac, Ctrl-A on Windows) and delete it.
>
> First, paste this and click **Run** to wipe the public schema:"

```sql
drop schema if exists public cascade;
create schema public;
grant all on schema public to postgres, anon, authenticated, service_role;
```

> "Supabase will pop up a warning that says the query contains destructive operations and asks you to confirm. That's expected — `drop schema` is destructive by design, and on a fresh install there's nothing in there worth keeping. Click **Run destructive query** (or whatever the confirm button says) to proceed. It should then say 'Success. No rows returned.'
>
> Now click **New query** again, open `connectors/supabase/migrations/0001_pectus_v04.sql` in your install folder, copy everything in it, and paste it into the empty editor. Click **Run**. You may see the same destructive-operations warning again because the migration also drops a few existing triggers and policies as it sets things up. Confirm and proceed. The query should finish in a few seconds. If it errors, paste the error message back to me."

Wait for confirmation. If they paste an error, diagnose it. Most failures are an extension prerequisite (`uuid-ossp`, `pgcrypto`, `unaccent`) that the user can enable from the same editor with a one-liner you give them.

If the user explicitly tells you their Supabase project is brand-new and empty, the schema-drop step is harmless but optional.

### 6c. Have the user create the admin user

Still in plain words:

> "Still in the Supabase dashboard, go to **Authentication** in the left sidebar, then **Users**, then **Add user → Create new user**. Pick the email and password you'll use to sign in to Pectus from now on. Password 12+ characters."

Wait until they confirm they've created the user. Then **don't move on yet**. Ask them this verbatim:

> "Before we continue, save both of these somewhere you can recover them later (password manager, secure notes, etc.). I'll wait. The password specifically: I won't have it stored anywhere, neither will Pectus. The only way to log in to your CMS in step 9 is the password you just set, and the only way to recover a lost password is to reset it from the Supabase dashboard. Tell me 'saved' once you've put both in your password manager, and tell me the email so I can remember it for step 9."

Wait for the explicit "saved" signal before advancing. Don't accept "ok" or "got it"; require the word that confirms the action was actually taken. This is one of the most-forgotten install steps and locks users out of their own CMS later.

Once they say saved and give you the email, remember it for step 9. You don't need their password.

### 6d. Sync the brand row to Supabase

Step 4 wrote `brands/<slug>/brand.json` to disk, but the database doesn't know about it yet. Push the brand row in:

```
cd <install path> && npx pectus brand sync
```

This walks every `brands/<slug>/brand.json` on disk and upserts each into the Supabase `brands` table by slug. Output should read `Synced 1 brand(s).` (or however many brand directories exist). If it errors, surface the message exactly and stop — usually a stale env var or a missed step in 6b/6c.

### 6e. Done

The database has the Pectus schema, the brand row exists, the user has an admin account. The `.env.local` from step 5 already has the values the CMS needs.

## 7. Connect Google (Search Console + Analytics)

This step pulls in Search Console and Google Analytics data. There are two outside-the-terminal pieces:

1. **Create a service account in the user's Google Cloud project** (the same project from step 5). In the Google Cloud Console: IAM & Admin → Service Accounts → Create Service Account. Name it anything (e.g. `pectus-reader`). Skip the "Grant access" role step (no IAM role is needed for GA4/GSC reads). Click Done.
2. **Create and download a JSON key for the service account.** On the service account's Details page → Keys tab → Add Key → Create new key → JSON → Create. The browser downloads a `.json` file. Tell the user to put it somewhere safe and to give you the absolute path to the file.
3. **Add the service account email as a Viewer in GA4 and Search Console.** Walk the user through the GA4 add (Admin → Property access management → +Add users → paste service account email → role Viewer → untick "Notify by email" → Add) and the Search Console add (Settings → Users and permissions → Add user → paste email → Restricted permission).

### Heads-up: Google sometimes won't accept the service account immediately

This is a known Google quirk, not a Pectus bug. Even when the project ID is correct, the relevant APIs are enabled (Admin, Data, Search Console), and the email is copied directly from the service account's Details page, GA4 and Search Console will sometimes reject the email with "this user doesn't exist" for 30 to 60 minutes (occasionally longer). Incognito mode, waiting, and re-pasting often don't help. There's no good public explanation for it; it's just Google's principal-lookup edge cache being slow.

If this happens, **don't block the install**. Tell the user something like:

> "Google's being weird about recognizing your service account. This happens; not your fault. The credentials you already have (the JSON key file and the email) are fine; Google just hasn't finished propagating them yet. We'll skip this step for now. When GA4 and Search Console finally accept the email (usually within an hour or two), come back and run `npx pectus connect google`. It'll prompt you to paste the JSON, ask which GA4 property and Search Console site to track, test both connections, and save everything. Until then, Pectus runs fine without Google data; the dashboard just marks suggestions as 'no traffic data'."

Make sure the user has the JSON key file saved somewhere safe (note the path in your chat to them so they can find it later) and **move on to step 8**. Don't write Google credentials to `.env.local`; Pectus stores the service-account JSON in the Supabase `integrations` table via `npx pectus connect google`, not in env vars.

### When it works first try

If GA4 and Search Console accept the email straight away (most users): run `npx pectus connect google`. It's interactive: it asks the user to paste the full service-account JSON, asks for a GA4 property ID and a Search Console site URL, then tests both connections live. If either test fails, surface the error and stop. The most common cause is the user adding the service account in GA4 but not Search Console (or vice versa); have them double-check both. On success the command writes the JSON, property ID, and site URL into the `integrations` table in Supabase.

## 8. Vercel and GitHub (optional, deferred)

The Vercel and GitHub connectors that ship with the CLI today are stubs — they print "coming in v2" and exit. Do **not** offer to run them. The tokens the user pasted in step 5 still live in `.env.local`; the publish flow inside Content Hub (step 11) reads them directly when it commits a page.

Walk the user through this step one item at a time, in this order. Don't bundle them into one prompt with multiple options.

### 8a. GitHub

Tell the user, in plain words:

> GitHub is where Pectus pushes the static pages it generates. When you publish an article from inside Pectus, it commits the page's JSON to a content-hub repo on GitHub, and Vercel auto-deploys it from there. The GitHub token you pasted in step 5 is already in `.env.local`, so there's nothing to set up here. We'll point Pectus at the actual repo from inside the CMS during step 11 (Content Hub setup).

Then move on. Don't ask anything; this step is just framing so the user knows GitHub is wired up and what it does.

### 8b. Vercel

Tell the user, in plain words:

> Vercel is where the public site lives once Pectus pushes pages to GitHub. Vercel watches your content-hub repo and rebuilds the site every time Pectus commits to it. The Vercel token you pasted in step 5 is already in `.env.local`. You'll connect Vercel to the GitHub repo when you set up Content Hub in step 11; nothing to do here right now.

Then move on. Same shape: framing only, no prompt.

If the user explicitly asks to verify the tokens or test the connections, tell them the connectors aren't wired yet and the verification happens implicitly the first time Pectus tries to publish (step 11+). Don't invent a CLI command to run.

## 9. Start the CMS

### 9a. Verify `.env.local` before starting the dev server

Before running `npm run dev`, confirm that `.env.local` has the values the CMS needs. The Next.js dev server reads env at startup; if env is missing or named wrong, the CMS crashes at first request with `Your project's URL and Key are required to create a Supabase client!` (or similar).

Read `.env.example` at the install root. It is the canonical list of variable names. Then read `.env.local` and confirm:

- All three Supabase entries exist with non-empty values and the **exact** names from `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- `ANTHROPIC_API_KEY` exists with a value starting with `sk-ant-`.
- `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` exist if the user completed step 5's Google sub-steps. (They can be empty strings if the user is deferring all Google setup.)

If any required Supabase or Anthropic value is missing, fix it before starting the dev server. Don't paraphrase variable names from memory; use the names exactly as they appear in `.env.example`.

If a `npm run dev` is already running from earlier, tell the user to stop it (Ctrl-C in that terminal) before starting again. Next.js does not hot-reload `.env.local` changes; a stale dev server will keep using the env it had at boot.

### 9b. Start the dev server

```
npm run dev
```

This boots the Next.js admin app at `http://localhost:3000`. The user signs in with the admin email and password they set in step 6. They'll land on `/brands/<slug>` showing the brand from step 4 with an empty Projects list — that's expected; they create their first project in the next step.

If another Pectus is already running on port 3000 (the user has a different brand's install open), start this one on a different port:

```
PORT=3001 npm run dev
```

Then load `http://localhost:3001`. Tell the user which port their CMS is on so they can re-open the right one later.

## 10. Create the first project

The user runs this in their own terminal (not the Claude session). Always include the `cd` prefix using the install path from step 2:

```
cd <install path> && npx pectus project create
```

(For the default install location: `cd ~/pectus && npx pectus project create`.)

A project is one market or audience segment. If the user only sells in one country, one project is enough. If they have separate sites for the UK, US, and Sweden, that's three projects. The wizard asks four questions:

1. **Market name** — a human label, e.g. "United Kingdom" or "DTC US". For single-market users, anything descriptive like "Main", "Primary", or the brand name works.
2. **Code** — a short identifier for this project, used in URLs and as the project's handle. Lowercase letters, digits, and dashes only. Pick `uk` for the United Kingdom market, `dtc-us` for direct-to-consumer US. **For a single-market install (most common), `main` is the standard pick. The brand name (e.g. `acme`) also works.**
3. **Locale** — language and country, e.g. `en-GB` for British English, `en-US` for American English, `sv-SE` for Swedish.
4. **Seed keywords** — 5 to 10 short phrases the project plans content around when there's no Search Console traffic yet (e.g. "best dtc skincare, retinol myths, sensitive skin routine"). Optional; the user can add them later from Project Settings → Seed keywords. The dashboard's first analysis uses these as the starting topic spine.

The command creates the project row (under the brand from step 4), sets a default review policy, and saves the seed keywords. Open `http://localhost:3000/brands/<brand-slug>/projects/<code>` to see it.

> **What happened to the site shape and GitHub repo questions?** They moved into the Content Hub settings page in the CMS (next step). The base project just captures identity now; the publish-target details live with the app that uses them.

## 11. Activate apps for the project

In v0.4.2 every project starts with no apps active — the user picks. Walk them through activating Content Hub if they want a public site (most users do):

1. Open `http://localhost:3000/brands/<slug>/projects/<code>/apps` in their browser. (Or just click **Apps** in the project's sidebar.)
2. Find the **content-hub** row and click **Activate**. The badge flips to "Active". The Content Hub group appears in the project sidebar with Pages, Articles, Plan, Gap, Sources, Reviews, and Settings (Site URL / Redirects / Review policy) as children.
3. **Configure the publish target.** Click **Site URL** in the Content Hub sidebar group. Fill in:
   - **Mount slug** — `/` if Pectus runs the whole site, `/insights/` (or similar) if Pectus only adds a section under an existing site.
   - **GitHub repo** — where Pectus pushes built pages. The user should:
     1. Open github.com → **New repository** → name it (something like `<their-brand>-pectus`) → don't tick README/license/gitignore → **Create repository**.
     2. Copy the URL from the browser address bar (looks like `https://github.com/yourname/yourrepo`).
     3. Paste it into the form. It accepts the full URL, the short `github.com/yourname/yourrepo` form, or the bare `yourname/yourrepo` form.
     4. Or leave blank — the project still works for authoring; only Publish needs the repo set, and the publish button shows an inline CTA to come back here.

   **Important if the user already has a website on Vercel + GitHub.** If they want Pectus to replace their existing site (most common scenario), tell them: don't reuse the existing site's repo. Use a fresh empty repo. After install, they'll switch their Vercel project's git source to the new repo. Full details at https://pectus.ai/docs/faq/install/replace-or-add-to-existing-site.

If the user is installing Pectus for analysis only (no public site), skip steps 11.2 and 11.3. They can activate Content Hub later from the project's Apps page whenever they decide to publish.

Other apps the user might want to activate now or later (each from the same Apps page): **gsc** for Search Console queries, **ga4** for Google Analytics traffic, **seed-keywords** for a manual keyword list. Activation just adds the surface to the sidebar; per-app config (Google service account, GA4 property, Search Console site) lives under brand Settings → Google integration.

## 12. Run the first analysis

```
npx pectus analyze --project <code> --skill weekly-analysis
```

(Or have the user click "Run weekly analysis" on the dashboard — same effect.)

This runs the `weekly-analysis` skill. It gathers everything Pectus knows about the project (keywords, existing articles, the ICP, brand voice, knowledge insights) and asks Claude to produce a content plan: what to write next, ranked by projected traffic.

Wait for it to finish (typically 30 to 90 seconds). When it returns, summarize the result for the user in plain words: how many post suggestions came back, the top three topics by score, any of their existing posts the analysis flagged as rising. Then point them at the dashboard to read the full output.

## 13. Pectus is awake. Pick a door.

The CMS is running at `http://localhost:3000`, signed in as the admin from step 6. The first project exists. The first analysis has run. Pectus knows who they are, what they care about, and what data they have.

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
