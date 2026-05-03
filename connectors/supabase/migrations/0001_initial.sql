-- 0001_initial.sql
-- Pectus v1 initial schema. Idempotent and safe to re-run.
-- Generated from content-hub-cms run_this.sql with generation tables stripped
-- and Pectus-specific additions (skill_runs, review_policy, review_queue_items,
-- review_approvals, brand_profile font fields, storage buckets).

-- ============================================================================
-- 1. Extensions
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================================
-- 2. Tables
-- ============================================================================

-- ---- profiles ----
-- One row per signed-in user. Mirrors auth.users.id. Roles drive what surfaces
-- a user can see and which review actions they can take. The "sales" role is
-- DEPRECATED in Pectus v1 (sales tool ships as a community app) but is still
-- accepted so existing seed data and forks don't break.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text check (role in ('drafter','brand_reviewer','market_lead','sales')),
  is_admin boolean not null default false,
  phone text,
  calendar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---- workspaces ----
-- Each workspace is one market / locale segment. Most write tables are scoped
-- to a workspace_id.
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  locale text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---- brand_profile ----
-- Singleton brand row. The `singleton = true` row is the only one we ever
-- query / update; the unique index enforces "exactly one".
create table if not exists public.brand_profile (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true,
  voice text,
  tonality text,
  primary_color text,
  secondary_color text,
  logo_url text,
  guidelines_md text,
  image_guidelines_md text,
  image_model text default 'imagen-4',
  website_url text,
  sitemap_url text,
  reference_image_urls jsonb not null default '[]'::jsonb,
  cameras jsonb not null default '[]'::jsonb,
  example_photo_categories jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create unique index if not exists brand_profile_singleton_idx
  on public.brand_profile (singleton)
  where singleton = true;

-- Brand font fields (Pectus addition). Each font has a source — system,
-- a Google Fonts URL, or uploaded files in the brand-fonts bucket.
alter table public.brand_profile add column if not exists font_heading_source text default 'system' check (font_heading_source in ('system','google','uploaded'));
alter table public.brand_profile add column if not exists font_heading_family text;
alter table public.brand_profile add column if not exists font_heading_google_url text;
alter table public.brand_profile add column if not exists font_heading_files jsonb;
alter table public.brand_profile add column if not exists font_body_source text default 'system' check (font_body_source in ('system','google','uploaded'));
alter table public.brand_profile add column if not exists font_body_family text;
alter table public.brand_profile add column if not exists font_body_google_url text;
alter table public.brand_profile add column if not exists font_body_files jsonb;

-- Pectus brand extensions: name + tagline + 5-token color palette + font slot blob.
-- The CMS Brand form writes to these jsonb fields directly. The granular
-- font_*_source/family/... columns above remain available for skills that want
-- individual fields.
alter table public.brand_profile add column if not exists name text;
alter table public.brand_profile add column if not exists tagline text;
alter table public.brand_profile add column if not exists colors jsonb not null default '{}'::jsonb;
alter table public.brand_profile add column if not exists fonts jsonb not null default '{}'::jsonb;

-- ---- integrations ----
-- One row per external provider. v1 uses the "google" row for the GA4 +
-- Search Console service-account JSON.
create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique,
  scope text,
  account_email text,
  service_account_json jsonb,
  ga4_property_id text,
  gsc_site_url text,
  last_verified_at timestamptz,
  last_verify_note text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---- icp_profiles ----
-- Per-workspace ICP. Personas + painpoints are jsonb arrays.
create table if not exists public.icp_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  personas jsonb not null default '[]'::jsonb,
  painpoints jsonb not null default '[]'::jsonb,
  notes text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

-- ---- articles ----
-- Inventory of the workspace's existing articles (read-only in Pectus v1).
-- `category` is the section (e.g. content-hub, productnews); `tag` is a
-- sub-category for filter chips. `blocks` is the parsed structured body.
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  slug text not null,
  title text not null,
  description text,
  category text,
  tag text,
  author text,
  author_image text,
  hero_image text,
  read_time text,
  word_count int,
  date_published timestamptz,
  date_modified timestamptz,
  blocks jsonb not null default '[]'::jsonb,
  source text,
  status text not null default 'imported',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, slug)
);

-- ---- keywords ----
-- Keyword inventory per workspace. Combines GSC pulls and CSV uploads.
create table if not exists public.keywords (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  keyword text not null,
  search_volume int,
  difficulty numeric,
  intent text,
  cpc numeric,
  current_rank int,
  metadata jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (workspace_id, keyword)
);

-- ---- content_sources ----
-- Sitemaps + competitor sites. workspace_id null = global source (admin-owned).
create table if not exists public.content_sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  name text not null,
  sitemap_url text not null,
  domain text,
  source_type text not null default 'own' check (source_type in ('own','competitor')),
  last_scraped_at timestamptz,
  last_scrape_note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---- content_source_pages ----
-- Indexed URLs from a content_sources sitemap crawl.
create table if not exists public.content_source_pages (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.content_sources(id) on delete cascade,
  url text not null,
  title text,
  published_at timestamptz,
  discovered_at timestamptz not null default now(),
  unique (source_id, url)
);

-- ---- answer_public_entries ----
-- AnswerThePublic exports: questions / phrases people ask around seed keywords.
create table if not exists public.answer_public_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  seed_keyword text not null,
  tab text not null,
  bucket text,
  text text not null,
  locale text,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (workspace_id, seed_keyword, tab, text)
);

-- ---- workspace_data_freshness ----
-- One row per (workspace, surface) tracking the last-touched-at timestamp so
-- the UI can show "icp updated 3 days ago", "keywords stale", etc.
create table if not exists public.workspace_data_freshness (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  surface text not null,
  last_updated_at timestamptz not null default now(),
  source text,
  primary key (workspace_id, surface)
);

-- ---- weekly_analyses ----
-- One row per (workspace, week_start) — the dashboard's structured Claude output.
create table if not exists public.weekly_analyses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  week_start date not null,
  status text not null default 'running' check (status in ('running','done','failed')),
  analysis jsonb,
  input_digest jsonb,
  error_message text,
  generated_by uuid references auth.users(id),
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  unique (workspace_id, week_start)
);

-- ---- skill_runs ----
-- Unified log of every skill execution. Replaces the inline Claude calls in
-- content-hub-cms; the runner writes here regardless of which skill ran.
create table if not exists public.skill_runs (
  id uuid primary key default gen_random_uuid(),
  skill_name text not null,
  workspace_id uuid references public.workspaces(id) on delete set null,
  input_digest jsonb,
  output jsonb,
  status text not null check (status in ('running','completed','failed')),
  error_message text,
  started_at timestamptz default now(),
  completed_at timestamptz,
  generated_by uuid references auth.users(id),
  model text,
  input_tokens int,
  output_tokens int,
  duration_ms int
);

-- ---- review_policy ----
-- Per-workspace publish-gate config. Which roles can sign off, how many
-- approvals are required, and how long until escalation.
create table if not exists public.review_policy (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  required_roles text[] not null default array['brand_reviewer'],
  min_approvals int not null default 1,
  escalate_after_days int,
  updated_at timestamptz default now(),
  updated_by uuid references auth.users(id)
);

-- ---- review_queue_items ----
-- Anything that needs sign-off before publish. Generic by source_kind so
-- different surfaces (skill_output, brand_asset, etc.) share one queue.
create table if not exists public.review_queue_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  source_kind text not null,
  source_id text not null,
  source_label text,
  review_state text not null default 'in_review' check (review_state in ('draft','in_review','approved','rejected','published')),
  submitted_by uuid references auth.users(id),
  submitted_at timestamptz default now(),
  decided_at timestamptz
);

-- ---- review_approvals ----
-- One row per approver decision on a review_queue_items row.
create table if not exists public.review_approvals (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references public.review_queue_items(id) on delete cascade,
  approver_id uuid references auth.users(id),
  approver_role text,
  decision text not null check (decision in ('approve','reject')),
  comment text,
  decided_at timestamptz default now(),
  unique (item_id, approver_id)
);

-- ============================================================================
-- 3. Indexes
-- ============================================================================

create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists workspaces_code_idx on public.workspaces (code);

create index if not exists articles_workspace_idx on public.articles (workspace_id);
create index if not exists articles_status_idx on public.articles (status);
create index if not exists articles_tag_idx on public.articles (tag);
create index if not exists articles_category_idx on public.articles (category);

create index if not exists keywords_workspace_idx on public.keywords (workspace_id);
create index if not exists keywords_volume_idx on public.keywords (workspace_id, search_volume desc nulls last);

create index if not exists icp_profiles_workspace_idx on public.icp_profiles (workspace_id);

create index if not exists content_sources_workspace_idx on public.content_sources (workspace_id);
create index if not exists content_sources_type_idx on public.content_sources (source_type);
create index if not exists content_source_pages_source_idx on public.content_source_pages (source_id);

create index if not exists answer_public_workspace_idx on public.answer_public_entries (workspace_id);
create index if not exists answer_public_seed_idx on public.answer_public_entries (workspace_id, seed_keyword);

create index if not exists weekly_analyses_workspace_idx on public.weekly_analyses (workspace_id, week_start desc);

create index if not exists skill_runs_workspace_idx on public.skill_runs (workspace_id, started_at desc);
create index if not exists skill_runs_skill_idx on public.skill_runs (skill_name, started_at desc);

create index if not exists review_queue_workspace_idx on public.review_queue_items (workspace_id, review_state);
create index if not exists review_queue_source_idx on public.review_queue_items (source_kind, source_id);
create index if not exists review_approvals_item_idx on public.review_approvals (item_id);

-- ============================================================================
-- 4. Helper functions + triggers
-- ============================================================================

-- updated_at trigger function. Reused by every table that has updated_at.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Helper: is the current auth user an admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- New-user trigger: create a profiles row when an auth.users row is inserted.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, is_admin)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    'drafter',
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Attach updated_at trigger to every table that has the column.
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'profiles',
      'workspaces',
      'brand_profile',
      'integrations',
      'icp_profiles',
      'articles',
      'content_sources'
    ])
  loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I;'
      'create trigger set_updated_at before update on public.%I '
      'for each row execute function public.set_updated_at();',
      t, t
    );
  end loop;
end;
$$;

-- ============================================================================
-- 5. Row-level security
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.brand_profile enable row level security;
alter table public.integrations enable row level security;
alter table public.icp_profiles enable row level security;
alter table public.articles enable row level security;
alter table public.keywords enable row level security;
alter table public.content_sources enable row level security;
alter table public.content_source_pages enable row level security;
alter table public.answer_public_entries enable row level security;
alter table public.workspace_data_freshness enable row level security;
alter table public.weekly_analyses enable row level security;
alter table public.skill_runs enable row level security;
alter table public.review_policy enable row level security;
alter table public.review_queue_items enable row level security;
alter table public.review_approvals enable row level security;

-- Default v1 model: any authenticated user can read every workspace-scoped
-- table; writes are open to authenticated users. The CMS enforces role logic
-- in server actions. The service-role key bypasses RLS for server-side jobs.
-- Tighten per-workspace once Pectus grows multi-tenant beyond a single team.

-- profiles: each user can read their own row; admins can read every row.
drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists profiles_admin_insert on public.profiles;
create policy profiles_admin_insert on public.profiles
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists profiles_admin_delete on public.profiles;
create policy profiles_admin_delete on public.profiles
  for delete to authenticated
  using (public.is_admin());

-- workspaces: read for everyone, write for admins only.
drop policy if exists workspaces_read on public.workspaces;
create policy workspaces_read on public.workspaces
  for select to authenticated using (true);

drop policy if exists workspaces_write_admin on public.workspaces;
create policy workspaces_write_admin on public.workspaces
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- brand_profile: read for everyone, write for admins.
drop policy if exists brand_profile_read on public.brand_profile;
create policy brand_profile_read on public.brand_profile
  for select to authenticated using (true);

drop policy if exists brand_profile_write_admin on public.brand_profile;
create policy brand_profile_write_admin on public.brand_profile
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- integrations: admins only (contains service-account JSON).
drop policy if exists integrations_admin_all on public.integrations;
create policy integrations_admin_all on public.integrations
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Workspace-scoped tables: any authenticated user reads/writes. Server-side
-- code is the source of truth for which workspace a user can touch.
drop policy if exists icp_profiles_rw on public.icp_profiles;
create policy icp_profiles_rw on public.icp_profiles
  for all to authenticated using (true) with check (true);

drop policy if exists articles_rw on public.articles;
create policy articles_rw on public.articles
  for all to authenticated using (true) with check (true);

drop policy if exists keywords_rw on public.keywords;
create policy keywords_rw on public.keywords
  for all to authenticated using (true) with check (true);

drop policy if exists content_sources_rw on public.content_sources;
create policy content_sources_rw on public.content_sources
  for all to authenticated using (true) with check (true);

drop policy if exists content_source_pages_rw on public.content_source_pages;
create policy content_source_pages_rw on public.content_source_pages
  for all to authenticated using (true) with check (true);

drop policy if exists answer_public_rw on public.answer_public_entries;
create policy answer_public_rw on public.answer_public_entries
  for all to authenticated using (true) with check (true);

drop policy if exists workspace_data_freshness_rw on public.workspace_data_freshness;
create policy workspace_data_freshness_rw on public.workspace_data_freshness
  for all to authenticated using (true) with check (true);

drop policy if exists weekly_analyses_rw on public.weekly_analyses;
create policy weekly_analyses_rw on public.weekly_analyses
  for all to authenticated using (true) with check (true);

drop policy if exists skill_runs_rw on public.skill_runs;
create policy skill_runs_rw on public.skill_runs
  for all to authenticated using (true) with check (true);

-- Review tables: read for everyone, policy edits admin-only.
drop policy if exists review_policy_read on public.review_policy;
create policy review_policy_read on public.review_policy
  for select to authenticated using (true);

drop policy if exists review_policy_write_admin on public.review_policy;
create policy review_policy_write_admin on public.review_policy
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists review_queue_rw on public.review_queue_items;
create policy review_queue_rw on public.review_queue_items
  for all to authenticated using (true) with check (true);

drop policy if exists review_approvals_rw on public.review_approvals;
create policy review_approvals_rw on public.review_approvals
  for all to authenticated using (true) with check (true);

-- ============================================================================
-- 6. Storage buckets
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('brand-assets', 'brand-assets', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('brand-fonts', 'brand-fonts', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('article-images', 'article-images', true)
on conflict (id) do nothing;

-- Storage RLS: authenticated users can upload to and manage objects in the
-- three Pectus buckets. Public read works because the buckets are public.
do $$
declare
  b text;
begin
  for b in select unnest(array['brand-assets','brand-fonts','article-images'])
  loop
    execute format(
      'drop policy if exists %I on storage.objects;'
      'create policy %I on storage.objects '
      'for all to authenticated '
      'using (bucket_id = %L) '
      'with check (bucket_id = %L);',
      b || '_authenticated_rw',
      b || '_authenticated_rw',
      b, b
    );
  end loop;
end;
$$;

-- ============================================================================
-- 7. Seed data
-- ============================================================================

-- Singleton brand row. Workspace seeding is a CLI step.
insert into public.brand_profile (singleton)
values (true)
on conflict do nothing;
