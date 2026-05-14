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

> Hi. I'm going to wake Pectus up on your laptop. Plan for 30 to 60 minutes. Most of that is signing up for and verifying accounts (Supabase, Anthropic, optionally Vercel and GitHub). The actual setup work between accounts is short. When I need something from you I'll tell you exactly what to click or paste.
>
> Two quick orientation questions before we start, so I tailor the rest:
>
> 1. **Are you starting from scratch, or do you already have a website running** (with Google Analytics, Search Console, and a domain)? If you have an existing site, Pectus can either sit alongside it (publishing under a path like `/insights/`) or replace it. Either's fine; the answer just changes a couple of later steps.
> 2. **Do you want Pectus to publish a public site,** or are you using it for analysis and content production only (drafts and reports stay inside Pectus)?
>
> If you're not sure yet, "starting fresh, will publish" is the most common path. We can change course later.
>
> If you don't know what to do at any point — what something means, why I'm asking, whether your answer is good enough — just ask me like a friend. There are no dumb questions here. I'd rather pause and explain than have you click through something you weren't sure about.
>
> Ready?

Wait for them to answer the two orientation questions and confirm ready. Note their answers — you'll reference them in step 7 (Vercel/GitHub) and step 10 (Activate apps).

Then walk them through the steps below in order. Don't skip steps. Don't reorder them. If a step fails, show the error exactly as it came back and stop. Don't silently retry.

**Note on Google (Search Console + Analytics).** Google connection used to live in this install flow as a required step. It is now deferred to the moment the user activates the GSC or GA4 app inside the CMS. That keeps the install short and means the user only does the Google Cloud + service-account setup if and when they actually need it. If the user asks about Google during the install, tell them: "We'll wire that up later, when you turn on the Search Console or Analytics app inside Pectus. The install flow no longer makes you do it upfront."

**Critical rule: never advance to the next step unless EITHER (a) the current step is verifiably complete, with every sub-action done and every expected output confirmed, OR (b) the user has explicitly told you it's OK to move on.** Both paths are valid; one of them must hold. Don't decide on the user's behalf that something "can be dealt with later". Don't infer completion from context. If a step has multiple sub-actions, all of them have to land before you treat (a) as satisfied. If you're tempted to "circle back later" to anything in the current step, stop and ask the user instead. Optional sub-steps still need an explicit user call to skip; that call is theirs to make, not yours.

**Critical rule: every shell command you ask the user to run in their own terminal must `cd` into the install path first.** When you give the user a `!`-prefixed command (or otherwise tell them to type something into their own terminal), wrap it with `cd <install path> && ...`. Don't assume the user's terminal is already in the right folder; they may have opened a fresh shell, switched directories, or never been there. Use the install path the user picked in step 2 (default `~/pectus`, sometimes a brand-suffixed folder). Example: `cd ~/pectus && npx pectus project create`, not `npx pectus project create`.

Speak to the user like a person who has installed maybe one or two dev tools before. Define jargon the first time it shows up. When you ask for a value, say what it looks like (e.g. "starts with `sk-ant-`"). When you point them at a console, tell them what they'll click once they're there.

**Critical rule: don't expose scary diagnostic noise to the user.** This includes: raw npm error output, stack traces, source-code reads, exploratory `which`/`ls`/`cat` runs, "let me check the CLI source" rambling, half-finished thoughts about whether something might be a stub, and back-and-forth Bash invocations to test commands. The user sees terminal output as a wall of red and assumes things are broken. Do all that work silently if you need to. Only what's necessary for the user to know — what's done, what's next, what they need to type or click — should reach them. If you discover something unexpected (a CLI command isn't wired, an env var is missing), summarize the finding in one calm sentence and tell them what you're doing about it. Don't paste the proof.

**Critical rule: open every step with a one-line user-facing preamble.** Format: `**Step N: <title>.** <one sentence on why this step exists, in plain words>.` Then do the work. The preamble text for each step is given inside that step below — print it verbatim. The point is that a non-technical user reading the chat understands what they're about to do and why before any commands run.

**Critical rule: avoid CLI jargon in user-visible text.** Words like `npm link`, `PATH`, `npx`, `bin`, `symlink`, `stub`, `source` are scary if the user doesn't already know them. If you must run a CLI command in front of them, frame it: "I'll run `<command>` — this <plain-words explanation>." If you must say a jargon term, define it inline once. Better: do the technical step silently and tell the user the result in plain words ("Pectus is now installed locally" instead of "I just `npm link`-ed the cli/ folder so `pectus` is on `PATH`").

**Critical rule: short messages, frequent check-ins.** No walls of text. Two or three sentences max per message, then a check-in like "Good to keep going?" or "Want me to continue?" or "Anything to ask before we move on?". The user should feel like they're chatting with a friend who's helping, not reading a manual. If a step has multiple sub-actions, walk through them one at a time with a check-in between, not as a single bullet list dump. Long explanations belong inline in pectus.md (for you), not in chat (for the user).

---

## 1. Check prerequisites

Print to the user verbatim:

> **Step 1 of 12: prerequisites.** Quick check that your laptop has the basic tools Pectus needs to run (Node, npm, git). 30 seconds.

Then run:

```
which node npm npx git
```

You need Node.js 20.19 or later, npm 10+, and git. The 20.19 floor is set by Vite (used inside the CMS build) and several other deps that need ≥20.18.1. If `node --version` reports anything below 20.19, install a newer Node before continuing — `npm install` will warn loudly otherwise and parts of the dev server can fail in non-obvious ways. macOS path: install Homebrew (`https://brew.sh`), then `brew install node git`. To pin a specific version, use `nvm install 20` and `nvm use 20`.

## 2. Clone the upstream repo (or confirm an existing clone)

Print to the user verbatim:

> **Step 2 of 12: downloading Pectus.** I'm putting the Pectus code on your laptop so you can run it locally. Takes about a minute.

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

Print to the user verbatim:

> **Step 3 of 12: installing the building blocks.** Pulling down the libraries Pectus uses. About 60 to 90 seconds.

Run:

```
npm install
```

Pectus is set up as an npm workspace, so this single install also links the `pectus` CLI into `node_modules/.bin/`, making `npx pectus ...` work in later steps.

Verify the link landed by running silently:

```
npx pectus --help
```

If that prints help text, you're set. If it errors with "could not determine executable to run" or similar, the workspace install didn't complete cleanly — re-run `npm install` from the install root once more. **Do not run `npm link` ad-hoc** to fix it; that creates a global symlink the user has to clean up later. A clean re-install of the root is the right path.

When the install (and verify) finish, tell the user in plain words:

> "Done. Pectus's building blocks are in place."

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

Print to the user verbatim:

> **Step 5 of 12: signing up for the services Pectus connects to.** Supabase and Anthropic are required (and optionally Vercel + GitHub if you said you'll publish). Most of the install time happens here — accounts, verification emails, copy-pasting keys. I'll walk you through one at a time. Google (Search Console + Analytics) is deferred to inside the CMS, so you'll only set that up if and when you activate those apps.

Then check in:

> "Ready to start with Supabase?"

Wait for a yes before listing the Supabase steps.

Three services are required to boot Pectus. Two more are optional. Walk the user through each one in order. For each, give them the link, wait for them to sign up, then ask for the specific value Pectus needs. Write each value into `cms/.env.local` as you receive it (use `.env.example` at the install root as the field reference). **The env file lives at `cms/.env.local`, not at the install root** — Next.js reads it from the CMS folder. The Pectus CLI also reads from `cms/.env.local` (with a fallback to legacy root `.env.local` for upgraded installs).

**Before you start asking, read `cms/.env.local` if it exists** (and the legacy `.env.local` at the install root if it exists from an older install — copy any values from there into `cms/.env.local` and tell the user you've done so). For every variable that's already set to a non-empty value, do *not* ask the user to provide it again. Print one line per found variable, e.g. `Found NEXT_PUBLIC_SUPABASE_URL in .env.local — keeping.` (Mask secret-shaped values — show only the first 4 and last 4 characters, e.g. `eyJh…X9Yz`.) Then ask only for the values that are still missing. The user has likely been through the install before, or pasted the file directly; respect that. If a saved value turns out to be wrong later (verify step fails), tell the user which variable is suspect and ask for a replacement, but don't pre-emptively re-prompt for things that are already there.

**Required**

- **Supabase** — https://supabase.com. This is the database. The user creates the project themselves so they stay in control of the account. After signup, walk them through this:
  1. In the dashboard, click **New Project**. Pick an organization, name the project (anything, e.g. `pectus-<brand-slug>`), pick a region close to them, and set a database password (12+ characters, into the password manager now).
  2. Wait around 2 minutes for the project to provision.
  3. Open **Project Settings → API**. Three values to copy and paste back to you, one at a time:
     - **Project URL or ref**. Look for either of these: a full URL like `https://xyzabc.supabase.co`, or just the project ref/ID (the short string in the dashboard URL `https://supabase.com/dashboard/project/<ref>`). Recent Supabase UI revisions sometimes show only the ref/ID and not the full URL. Either form is fine — paste whichever you find. Pectus accepts both.
     - **anon (public) key** (a long string starting with `eyJ...`). Important: in the current Supabase UI the first page of API settings shows new "publishable" / "secret" keys that Pectus does not use. The `anon` and `service_role` keys live on a second tab (look for "Legacy API keys", "JWT-based keys", or similar). Tell the user explicitly: do not paste the first two keys they see on the landing tab; switch tabs first and look for the keys named `anon` and `service_role`.
     - **service_role (secret) key** (also starts with `eyJ...`, on the same second tab as `anon`, keep this one private).
  4. Open https://supabase.com/dashboard/account/tokens (a separate page from the project — it lives on the user's account, not inside the project). Click **Generate new token**, name it anything (e.g. `pectus`), copy the value (starts with `sbp_`). Pectus needs this to apply schema migrations and other Management-API operations on the user's behalf.
  Write all four into `cms/.env.local` as `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ACCESS_TOKEN`. The first three are project-scoped; the access token is account-scoped and authenticates Pectus to the Supabase Management API.
- **Anthropic** — https://console.anthropic.com. This is what powers Claude inside Pectus. After signup, click "API keys" in the sidebar, then "Create key". The value starts with `sk-ant-`. Paste it here. **Heads-up on cost**: a full first-time install with one project ranges from $5 to $15 in Anthropic credits depending on how many analyses the user runs. Tell the user to load $20 to be safe; they can top up later.

**Optional (skippable)**

- **Vercel** — https://vercel.com. Only needed when the user is ready to publish their content-hub site to a public URL. Create a token at https://vercel.com/account/tokens. Skip if they're staying local-only for now or if they answered "analysis only" to the welcome question.
- **GitHub** — https://github.com. Used by the publish flow to commit pages to a content-hub repo. Pectus will help set this up later in the Vercel/GitHub step.

**Deferred until you need them** (do not collect now):

- **Google Cloud (Search Console + Analytics)**. The user will set this up inside the CMS when they activate the GSC or GA4 app. The CMS walks them through enabling the three Google APIs, creating a service account, downloading the JSON key, and adding the service account email as a Viewer in GA4 + Search Console. Don't ask for any of this now.
- **Google Ads / Meta / LinkedIn ad spend**. Same pattern — wired up per-app when activated. The LinkedIn Marketing Developer Platform application does take 1 to 3 weeks to approve, so if the user knows they want LinkedIn ad data eventually, mention they can apply early at https://www.linkedin.com/developers; it doesn't block anything.

## 6. Provision Supabase

Print this to the user verbatim before doing anything else in this step:

> **Step 6 of 12: provisioning Supabase.** This is the longest step in the install — plan for 5-10 minutes. You'll be flipping between this terminal and the Supabase dashboard a few times: pasting two pieces of SQL into Supabase's SQL editor (one to wipe the schema clean, one to lay down the Pectus tables), creating your admin login inside Supabase, saving that login somewhere safe, and then letting Pectus push your brand profile into the new database. I'll walk you through each piece, one at a time, and tell you what to do at each stop. Ready?

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

> "Before we continue, save both of these somewhere you can recover them later (password manager, secure notes, etc.). I'll wait. The password specifically: I won't have it stored anywhere, neither will Pectus. The only way to log in to your CMS in step 8 is the password you just set, and the only way to recover a lost password is to reset it from the Supabase dashboard. Tell me 'saved' once you've put both in your password manager, and tell me the email so I can remember it for step 8."

Wait for the explicit "saved" signal before advancing. Don't accept "ok" or "got it"; require the word that confirms the action was actually taken. This is one of the most-forgotten install steps and locks users out of their own CMS later.

Once they say saved and give you the email, remember it for step 8. You don't need their password.

### 6d. Sync the brand row to Supabase

Step 4 wrote `brands/<slug>/brand.json` to disk, but the database doesn't know about it yet. Push the brand row in:

```
cd <install path> && npx pectus brand sync
```

This walks every `brands/<slug>/brand.json` on disk and upserts each into the Supabase `brands` table by slug. Output should read `Synced 1 brand(s).` (or however many brand directories exist). If it errors, surface the message exactly and stop — usually a stale env var or a missed step in 6b/6c.

### 6e. Close out step 6 and ask before continuing

The database has the Pectus schema, the brand row exists, the user has an admin account. The `.env.local` from step 5 already has the values the CMS needs.

**Do not roll into step 7 automatically.** After `pectus brand sync` succeeds, tell the user step 6 is complete and ask permission before moving on. Print this verbatim:

> Step 6 is done — Supabase has the schema, your brand row is in place, and your admin login is created. Ready to move on to step 7 (Vercel and GitHub for publishing — optional)?

Wait for an explicit yes before printing the step 7 preamble. If the user says "skip" or "later," go straight to step 8 instead.

## 7. Vercel and GitHub (optional at this stage)

Print to the user verbatim:

> **Step 7 of 12: Vercel and GitHub** (only if you said you'll publish — skip otherwise). Vercel serves your published site to visitors; GitHub stores the page files. Both free. Skippable at install time; required before publishing.

If the user said "analysis only" in the welcome, **skip this whole step** and jump to step 8. If they said "will publish" (or are unsure), check in:

> "Want to set up Vercel and GitHub now, or skip and come back to it before your first publish?"

If they say skip → jump to step 8. If yes, print this expectation-setter verbatim before starting:

> Heads up — this takes 15-20 minutes because we'll set up two accounts (if you don't already have them), create a GitHub repo for your published site, point a Vercel project at it, and generate two tokens. I'll walk you through each piece, one at a time.

Walk through GitHub first, then Vercel. The Vercel project needs the GitHub repo to already exist, so doing it in this order avoids backtracking.

### 7a. GitHub

Tell the user, in plain words:

> GitHub is where Pectus stores the files for your published site. When you hit Publish in Pectus, it commits each new page into a repo on GitHub, and Vercel watches that repo and rebuilds your site automatically.

Walk them through these one at a time, with a check-in between each:

1. **Create a GitHub account if they don't have one.** Go to https://github.com/signup. Email, username, password. Free.
2. **Create the content-hub repo.** Once signed in, top-right `+` icon → New repository. Name it after the project (e.g. `pectus-content-hub` or `<brand>-site`). Visibility can be Public or Private — Pectus works with either. Skip the README, .gitignore, and license toggles (Pectus fills the repo on first publish). Click Create repository. Note the repo URL for later.
3. **Generate a personal access token.** Top-right avatar → Settings → Developer settings (bottom of left sidebar) → Personal access tokens → Tokens (classic) → Generate new token (classic). Name it `Pectus`. Expiration: pick 90 days or No expiration. Scopes: tick `repo` (full) and `workflow`. Click Generate token. **Copy it immediately — GitHub only shows it once.**
4. **Have the user paste the token back.** Save it to `cms/.env.local` as `GITHUB_TOKEN=<value>`. Use the env-file write helper in the CLI (or have the user open `cms/.env.local` and add the line themselves) — never write it to a different file.

### 7b. Vercel

Tell the user, in plain words:

> Vercel is what serves your published site to visitors. It watches the GitHub repo you just created, and every time Pectus pushes a change to that repo, Vercel rebuilds and redeploys the site. The user never sees GitHub directly — Vercel handles the URL.

Walk them through these one at a time, with a check-in between each:

1. **Create a Vercel account if they don't have one.** Go to https://vercel.com/signup. Easiest path: click "Continue with GitHub" and authorize — that links the two accounts and saves a step later. Free Hobby tier is fine.
2. **Import the GitHub repo as a Vercel project.** Vercel dashboard → Add New → Project → Import Git Repository → pick the repo from step 7a → Deploy. Vercel will build an empty project (the repo is empty until first publish, which is fine — the build will finish in seconds). Note the production URL Vercel assigns (e.g. `your-repo.vercel.app`).
3. **Generate a Vercel token.** Avatar (top-right) → Settings → Tokens → Create Token. Name it `Pectus`. Scope: Full Account. Expiration: default fine. Click Create. **Copy it immediately — Vercel only shows it once.**
4. **Have the user paste the token back.** Save it to `cms/.env.local` as `VERCEL_TOKEN=<value>`.

### 7c. Done

Tell the user:

> Both tokens are saved. Once Pectus is running you'll connect this published site to a project from the Content Hub settings page in the CMS — that's where you'll paste the GitHub repo URL and pick which Vercel project gets the deploy.

Move on to step 8.

## 8. Start the CMS

Print to the user verbatim:

> **Step 8 of 12: turning Pectus on.** Booting the admin app on your laptop so you can sign in and start using it. About 30 seconds.

### 8a. Verify `cms/.env.local` before starting the dev server

Before running `npm run dev`, confirm that `cms/.env.local` (not the install root) has the values the CMS needs. The Next.js dev server reads env at startup; if env is missing, named wrong, or written to the wrong path, the CMS crashes at first request with `Your project's URL and Key are required to create a Supabase client!` (or similar).

Read `.env.example` at the install root. It is the canonical list of variable names. Then read `cms/.env.local` and confirm:

- All three Supabase entries exist with non-empty values and the **exact** names from `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- `ANTHROPIC_API_KEY` exists with a value starting with `sk-ant-`.

(Google OAuth env vars are no longer collected during install — they get set inside the CMS when the user activates the GSC or GA4 app.)

If any required Supabase or Anthropic value is missing, fix it before starting the dev server. Don't paraphrase variable names from memory; use the names exactly as they appear in `.env.example`.

If a `npm run dev` is already running from earlier, tell the user to stop it (Ctrl-C in that terminal) before starting again. Next.js does not hot-reload `.env.local` changes; a stale dev server will keep using the env it had at boot.

### 8b. Start the dev server

```
npm run dev
```

This boots the Next.js admin app at `http://localhost:3000`. The user signs in with the admin email and password they set in step 6. They'll land on `/brands/<slug>` showing the brand from step 4 with an empty Projects list — that's expected; they create their first project in the next step.

If another Pectus is already running on port 3000 (the user has a different brand's install open), start this one on a different port:

```
PORT=3001 npm run dev
```

Then load `http://localhost:3001`. Tell the user which port their CMS is on so they can re-open the right one later.

## 9. Create the first project

Print to the user verbatim:

> **Step 9 of 12: creating your first project.** A project is one market or audience — most people only ever have one called something like "main". It normally takes about two minutes to set up, and you do it through the CMS you just installed. If you'd rather set it up here in the terminal via the CLI, I can take you through that instead. **Want to set it up in the CMS or the CLI? Type CMS or CLI.**

A project is one market or audience segment. If the user only sells in one country, one project is enough. If they have separate sites for the UK, US, and Sweden, that's three projects. Branch on what the user typed:

### 9a. CMS path (recommended)

Tell the user, in plain words:

> Easiest path. The CMS is already running from step 8. In your browser, open `http://localhost:3000/brands/<brand-slug>` (replace `<brand-slug>` with the slug from step 4 — e.g. `http://localhost:3000/brands/acme`). You'll see a page with an **Add project** button at the top. Click it. A small form opens asking for three things:
>
> 1. **Name** — a human label like "Main", "Primary", or the brand name itself. For a single-market install, anything descriptive works.
> 2. **Code** — short identifier used in URLs (lowercase letters, digits, hyphens). The CMS auto-fills this from Name. For most installs, `main` is the standard pick.
> 3. **Locale** — language and country code, e.g. `en-US`, `en-GB`, `sv-SE`. Defaults to `en-US`.
>
> Click **Create project** and you're done. Tell me when you've created it (or paste any error you see).

When the user confirms it's created, **the install is complete**. Print this verbatim and stop:

> You're set up. Pectus is running at `http://localhost:3000`. From here you activate apps, configure them, and run analyses all from the CMS — no more terminal needed. Close this terminal whenever you're ready.

Do not continue to steps 10-12 on this path. Those are CLI-flow steps and don't apply when the user is driving from the CMS.

### 9b. CLI path

The wizard at `npx pectus project create` is **interactive** — it uses arrow-key prompts and a paste textarea that need a real terminal. The install agent (you) cannot drive these prompts from inside this session because there's no TTY attached. **Don't try to run it yourself, and don't offer to bypass the wizard by writing the project row directly into Supabase** — the official path is the wizard. If the user really doesn't want to open a terminal, suggest they switch to the CMS path (9a) instead.

Tell the user, in plain words:

> This wizard is interactive (arrow-key picks, paste box for keywords) so it needs a real terminal. Open a new terminal window and run:
>
> ```
> cd <install path> && npx pectus project create
> ```
>
> (For the default install location: `cd ~/pectus && npx pectus project create`.)
>
> It'll ask you four things:
>
> 1. **Market name** — a human label, e.g. "United Kingdom" or "DTC US". For single-market users, "Main", "Primary", or the brand name works.
> 2. **Code** — a short identifier used in URLs and as the project's handle (lowercase letters, digits, dashes). For a single-market install, `main` is the standard pick. The brand name (e.g. `acme`) also works.
> 3. **Locale** — language and country, e.g. `en-GB`, `en-US`, `sv-SE`.
> 4. **Seed keywords** — 5 to 10 short phrases the project plans content around when there's no Search Console traffic yet (e.g. "best dtc skincare, retinol myths, sensitive skin routine"). Optional; you can add them later from Project Settings → Seed keywords.
>
> Tell me when it finishes (or paste any error).

The command creates the project row (under the brand from step 4), sets a default review policy, and saves the seed keywords. Open `http://localhost:3000/brands/<brand-slug>/projects/<code>` to see it.

> **What happened to the site shape and GitHub repo questions?** They moved into the Content Hub settings page in the CMS (next step). The base project just captures identity now; the publish-target details live with the app that uses them.

## 10. Activate apps for the project

Print to the user verbatim:

> **Step 10 of 12: turning on the apps you want to use.** A project starts blank and you switch on the apps that fit. Most people switch on Content Hub (the bundled publish-to-a-public-site app) right away.

In v0.4.2 every project starts with no apps active — the user picks. Walk them through activating Content Hub if they want a public site (most users do):

1. Open `http://localhost:3000/brands/<slug>/projects/<code>/apps` in their browser. (Or just click **Apps** in the project's sidebar.)
2. Find the **content-hub** row and click **Activate**. The badge flips to "Active". The Content Hub group appears in the project sidebar with **Insights, Articles, Pages, Files, Sources, Settings** as children. (If the group doesn't appear immediately, ask the user to refresh the page once.)
3. **Configure the publish target** — only if the user said "will publish" in the welcome. Click **Settings** in the Content Hub sidebar group, then the **Site URL** sub-tab. Fill in:
   - **Mount slug** — `/` if Pectus runs the whole site, `/insights/` (or similar) if Pectus only adds a section under an existing site.
   - **GitHub repo** — where Pectus pushes built pages. The user should:
     1. Open github.com → **New repository** → name it (something like `<their-brand>-pectus`) → don't tick README/license/gitignore → **Create repository**.
     2. Copy the URL from the browser address bar (looks like `https://github.com/yourname/yourrepo`).
     3. Paste it into the form. It accepts the full URL, the short `github.com/yourname/yourrepo` form, or the bare `yourname/yourrepo` form.
     4. Or leave blank — the project still works for authoring; only Publish needs the repo set, and the publish button shows an inline CTA to come back here.

   **Important if the user already has a website on Vercel + GitHub** (the "existing site" path from the welcome). If they want Pectus to replace the existing site (most common scenario), tell them: don't reuse the existing site's repo. Use a fresh empty repo. After install, they'll switch their Vercel project's git source to the new repo. Full details at https://pectus.ai/docs/faq/install/replace-or-add-to-existing-site.

If the user said "analysis only" in the welcome, skip step 10.3. They can activate Content Hub publishing later from the same Settings page whenever they decide to publish.

**Activating Search Console (gsc) or Google Analytics (ga4).** If the user wants either, walk them through this in the same Apps page:

1. Find the **gsc** or **ga4** row → **Activate**.
2. The first time the user opens that app's surface, it will prompt for Google credentials. The CMS guides them through enabling the three Google APIs (Search Console API for gsc, Analytics Admin + Analytics Data for ga4), creating a service account in Google Cloud, downloading the JSON key, and pasting the service-account email into Search Console / GA4 as a Viewer. This is the deferred step from step 5 — done now, only if the user is actually turning the app on.
3. **Heads-up to give the user**: Google sometimes won't accept a brand-new service-account email immediately ("this user doesn't exist" error in GA4 / Search Console UIs, even though the email is correct). This is a known Google quirk — the principal can take 30 to 60 minutes to propagate. The credentials are fine; come back and retry the in-app connection later. Pectus runs without the data in the meantime; the dashboard just shows "no traffic data" placeholders.

The other inbound app worth knowing about now: **seed-keywords** for a manual keyword list (paste 5 to 30 phrases). It has no external dependencies — activate it and start typing.

## 11. Run the first analysis

Print to the user verbatim:

> **Step 11 of 12: running your first analysis.** Pectus reads everything you've given it (keywords, ICP, brand voice, traffic if connected) and asks Claude to produce a content plan ranked by projected traffic. Takes a minute.

**Recommended path:** open the dashboard at `http://localhost:3000/brands/<slug>/projects/<code>/apps/content-hub/insights` and click **Run first analysis**. The button walks through Snapshot → Stage 1 (Opus interpretation) → Stage 2 (Opus ideas) and renders the result inline when it finishes — same data the dashboard then keeps.

If the user prefers the CLI:

```
cd <install path> && npx pectus analyze --project <code> --skill weekly-analysis
```

The CLI path runs the same skill but writes a `skill_runs` row instead of populating the dashboard's interpretation/generation tables. **Result: nothing appears on the Insights page even though the analysis ran.** Use the CMS button as the primary path. The CLI is fine for scripting and for dumping a one-shot text output, but the dashboard surfaces only what the in-CMS Run button produces.

Wait for it to finish (typically 30 to 90 seconds). When it returns, summarize the result for the user in plain words: how many post suggestions came back, the top three topics by score, any of their existing posts the analysis flagged as rising. Then point them at the dashboard to read the full output.

## 12. Pectus is awake. Pick a door.

The CMS is running at `http://localhost:3000`, signed in as the admin from step 6. The first project exists. The first analysis has run. Pectus knows who they are, what they care about, and what data they have.

Now they choose what to do first. Present both doors clearly, then let them pick:

**Door A — Start producing with the bundled content-hub.**
Open the dashboard. The weekly analysis has ranked content opportunities by projected traffic. Pick one, click into the page builder, draft, publish. This is the fastest path to seeing Pectus do something useful, and it's where most users start.

**Door B — Teach Pectus a new trick.**
Pectus comes with content-publishing built in. If you want it to do something else (generate weekly LinkedIn posts, analyze a competitor's pricing, summarize customer reviews), you can teach it. Skip this for now and come back when you have a specific job in mind. When you do: run `npx pectus make-it skill` to write a new piece of logic, or `npx pectus make-it app` to add a new data source or a new place for Pectus to publish to.

Both doors can run in parallel. The choice is just "what do you want to try first."

Then, regardless of which door they pick, give them the operational basics in one tight list:

- **Re-open Pectus**: terminal → `cd <install path from step 2>` → `npm run dev` (or `PORT=3001 npm run dev` if you assigned a non-default port in step 8) → sign in with the email and password from step 6. If the user has multiple brands' Pectus installs on the machine, remind them which folder + port belongs to this brand.
- **Add your own data**: drop files (CSVs, BigQuery exports, audience research PDFs, anything) into `<install path>/knowledge/raw/`, then `npx pectus knowledge digest`. The digest turns the pile into structured insights every other skill consumes.
- **Pull updates**: `npx pectus update`. Rebases on upstream and runs new migrations. The skills and apps they've edited or written are not overwritten.
- **Something broke?**: `npx pectus doctor` checks env vars, reachability, config. Most "it broke" reports are a stale token; doctor catches that first.

That's it. They own the stack.
