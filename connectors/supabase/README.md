# connectors/supabase

Supabase is the primary data store: Postgres for relational data, Auth for user accounts, Storage for brand assets and font files.

## Env vars

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_PROJECT_REF
```

`pectus connect supabase` writes all four to `.env.local` after creating the project.

## What's in this folder

- `client.ts` — SSR-aware client factory. Use `createServerClient()` in server components, `createBrowserClient()` in client components.
- `provision.ts` — CLI hook. Creates a project via the Supabase Management API, runs migrations, seeds the first admin user.
- `migrations/` — idempotent SQL. Numbered: `0001_initial.sql`, `0002_*.sql`. Safe to re-run.

## Storage buckets

- `brand-assets` — logos, reference images. Authenticated read.
- `brand-fonts` — uploaded font files. Public read (browsers need to fetch them).
- `article-images` — article hero images and inline media. Public read.

## Migration policy

Migrations are forward-only. Don't edit shipped migrations — add a new numbered file. `pectus update` runs any pending migrations after pulling upstream.

Upstream service docs: https://supabase.com/docs
