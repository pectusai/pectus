# cms — Pectus admin app

The Next.js 16 admin UI you run at `localhost:3000`. Workspaces, Brand, Performance, Reviews, Admin.

## Run

From repo root:

```
npm run dev
```

Or from `cms/`:

```
npm run dev
```

Either way, the app comes up at `http://localhost:3000`.

## Structure (planned, populated in PR3)

```
cms/src/
├── app/
│   ├── (app)/                       authenticated routes
│   │   ├── workspaces/[code]/       per-market views (dashboard, articles, keywords, icp)
│   │   ├── brand/                   global brand config (with font upload UI)
│   │   ├── performance/             SEO performance dashboard
│   │   ├── reviews/                 compliance approval queue
│   │   └── admin/                   users, workspaces, usage
│   ├── login/                       Supabase Auth
│   └── api/                         analysis + integration endpoints
└── lib/
    ├── auth.ts                      requireUser, requireAdmin
    ├── workspace.ts                 workspace lookup helpers
    ├── skill-runner.ts              loads SKILL.md and runs Claude
    └── format-icp-context.ts        ICP → prompt context
```

## Skill runner

All skill execution goes through `lib/skill-runner.ts`. The dashboard's "Run weekly analysis" button, the CLI's `pectus analyze` command, and any future scheduled run all call into the same runner. This keeps usage logging and error handling in one place.

## Auth

Supabase Auth. Email/password by default; Google OAuth available but not domain-restricted. The first user (created during `pectus connect supabase`) is auto-promoted to admin.

## What's not here in v1

- Content generators (blog, social, ad, image). The data model supports them; the routes are removed.
- Sales battlecard tool. Schema preserved for future re-add.
- Skill authoring UI. Skills are upstream code — author them at `pectus.dev`, not in the CMS.
