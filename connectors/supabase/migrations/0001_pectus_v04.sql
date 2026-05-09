-- 0001_pectus_v04.sql
-- Pectus v0.4.2 baseline schema. Squashes the historical 0001-0008 chain
-- into a single migration that creates the v0.4.2 state in one pass.
--
-- v0.4.2 reframes Pectus as a connector framework. Workspaces become
-- projects (under brands). Apps activate per-project. App-specific config
-- lives on app_config(project_id, app_name, config).
--
-- v0.4.2 wipes data: any install upgrading from v0.4.1 must wipe its
-- Supabase project and re-run install. There is no backfill machinery.
--
-- Idempotent and safe to re-run.

-- ============================================================================
-- 1. Extensions
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists unaccent;

-- ============================================================================
-- 2. Helper functions (defined early so triggers below can reference them)
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public._slugify(input text)
returns text
language plpgsql
immutable
as $$
declare
  s text;
begin
  if input is null or trim(input) = '' then
    return 'default';
  end if;
  s := lower(public.unaccent(input));
  s := regexp_replace(s, '[^a-z0-9]+', '-', 'g');
  s := regexp_replace(s, '^-+|-+$', '', 'g');
  s := substr(s, 1, 80);
  if s = '' or s is null then return 'default'; end if;
  return s;
end
$$;

create or replace function public.is_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result boolean;
begin
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  ) into result;
  return result;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  has_admin boolean;
begin
  select exists(select 1 from public.profiles where is_admin = true) into has_admin;
  insert into public.profiles (id, email, full_name, role, is_admin)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    'drafter',
    not has_admin  -- first signed-in user auto-promotes to admin
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ============================================================================
-- 3. Core tables: profiles, brands, projects, integrations
-- ============================================================================

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

create index if not exists profiles_email_idx on public.profiles (email);

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text,
  tagline text,
  voice text,
  tonality text,
  primary_color text,
  secondary_color text,
  accent_alt text,
  accent_alt_ink text,
  surface_alt text,
  surface_inv text,
  color_ok text,
  color_warn text,
  color_err text,
  logo_url text,
  guidelines_md text,
  image_guidelines_md text,
  image_model text default 'imagen-4',
  website_url text,
  sitemap_url text,
  reference_image_urls jsonb not null default '[]'::jsonb,
  cameras jsonb not null default '[]'::jsonb,
  example_photo_categories jsonb not null default '[]'::jsonb,
  font_heading_source text default 'system' check (font_heading_source in ('system','google','uploaded')),
  font_heading_family text,
  font_heading_google_url text,
  font_heading_files jsonb,
  font_body_source text default 'system' check (font_body_source in ('system','google','uploaded')),
  font_body_family text,
  font_body_google_url text,
  font_body_files jsonb,
  font_mono jsonb,
  colors jsonb not null default '{}'::jsonb,
  fonts jsonb not null default '{}'::jsonb,
  radius text default 'default',
  imported_from jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create unique index if not exists brands_slug_idx on public.brands (slug);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  code text not null,
  name text not null,
  locale text not null default 'en',
  default_locale text not null default 'en',
  enabled_locales text[] not null default array['en']::text[],
  default_locale_skips_prefix boolean not null default true,
  mount_slug text not null default '/',
  site_url text,
  content_hub_repo text,
  content_hub_branch text not null default 'main',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists projects_brand_code_idx on public.projects (brand_id, code);
create index if not exists projects_brand_idx on public.projects (brand_id);

create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  provider text not null,
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
  updated_at timestamptz not null default now(),
  unique (brand_id, provider)
);

create index if not exists integrations_brand_idx on public.integrations (brand_id);

-- ============================================================================
-- 4. Apps registry: activated_apps + app_config (project-scoped)
-- ============================================================================

create table if not exists public.activated_apps (
  project_id uuid not null references public.projects(id) on delete cascade,
  app_name text not null,
  status text not null default 'active' check (status in ('active','paused')),
  config jsonb not null default '{}'::jsonb,
  activated_at timestamptz not null default now(),
  primary key (project_id, app_name)
);

create index if not exists activated_apps_project_idx on public.activated_apps (project_id);

create table if not exists public.app_config (
  project_id uuid not null references public.projects(id) on delete cascade,
  app_name text not null,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (project_id, app_name)
);

create index if not exists app_config_project_idx on public.app_config (project_id);

-- ============================================================================
-- 5. Project-scoped child tables
-- ============================================================================

create table if not exists public.icp_profiles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  personas jsonb not null default '[]'::jsonb,
  painpoints jsonb not null default '[]'::jsonb,
  notes text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create index if not exists icp_profiles_project_idx on public.icp_profiles (project_id);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
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
  unique (project_id, slug)
);

create index if not exists articles_project_idx on public.articles (project_id);
create index if not exists articles_status_idx on public.articles (status);
create index if not exists articles_tag_idx on public.articles (tag);
create index if not exists articles_category_idx on public.articles (category);

create table if not exists public.keywords (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  keyword text not null,
  search_volume int,
  difficulty numeric,
  intent text,
  cpc numeric,
  current_rank int,
  metadata jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (project_id, keyword)
);

create index if not exists keywords_project_idx on public.keywords (project_id);
create index if not exists keywords_volume_idx on public.keywords (project_id, search_volume desc nulls last);

create table if not exists public.content_sources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
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

create index if not exists content_sources_project_idx on public.content_sources (project_id);
create index if not exists content_sources_type_idx on public.content_sources (source_type);

create table if not exists public.content_source_pages (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.content_sources(id) on delete cascade,
  url text not null,
  title text,
  published_at timestamptz,
  discovered_at timestamptz not null default now(),
  unique (source_id, url)
);

create index if not exists content_source_pages_source_idx on public.content_source_pages (source_id);

create table if not exists public.answer_public_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  seed_keyword text not null,
  tab text not null,
  bucket text,
  text text not null,
  locale text,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (project_id, seed_keyword, tab, text)
);

create index if not exists answer_public_project_idx on public.answer_public_entries (project_id);
create index if not exists answer_public_seed_idx on public.answer_public_entries (project_id, seed_keyword);

create table if not exists public.project_data_freshness (
  project_id uuid not null references public.projects(id) on delete cascade,
  surface text not null,
  last_updated_at timestamptz not null default now(),
  source text,
  primary key (project_id, surface)
);

create table if not exists public.weekly_analyses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  week_start date not null,
  status text not null default 'running' check (status in ('running','done','failed')),
  analysis jsonb,
  input_digest jsonb,
  error_message text,
  generated_by uuid references auth.users(id),
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  unique (project_id, week_start)
);

create index if not exists weekly_analyses_project_idx on public.weekly_analyses (project_id, week_start desc);

create table if not exists public.skill_runs (
  id uuid primary key default gen_random_uuid(),
  skill_name text not null,
  project_id uuid references public.projects(id) on delete set null,
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

create index if not exists skill_runs_project_idx on public.skill_runs (project_id, started_at desc);
create index if not exists skill_runs_skill_idx on public.skill_runs (skill_name, started_at desc);

create table if not exists public.review_policy (
  project_id uuid primary key references public.projects(id) on delete cascade,
  required_roles text[] not null default array['brand_reviewer'],
  min_approvals int not null default 1,
  escalate_after_days int,
  updated_at timestamptz default now(),
  updated_by uuid references auth.users(id)
);

create table if not exists public.review_queue_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  source_kind text not null,
  source_id text not null,
  source_label text,
  review_state text not null default 'in_review' check (review_state in ('draft','in_review','approved','rejected','published')),
  submitted_by uuid references auth.users(id),
  submitted_at timestamptz default now(),
  decided_at timestamptz
);

create index if not exists review_queue_project_idx on public.review_queue_items (project_id, review_state);
create index if not exists review_queue_source_idx on public.review_queue_items (source_kind, source_id);

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

create index if not exists review_approvals_item_idx on public.review_approvals (item_id);

-- ============================================================================
-- 6. Topics + site plan + redirects + pages (content-hub structures)
-- ============================================================================

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  intent text check (intent in ('informational','commercial','transactional','navigational')),
  source text not null default 'analysis-suggested' check (source in ('analysis-suggested','user')),
  status text not null default 'unfulfilled' check (status in ('unfulfilled','planned','published')),
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, name)
);

create index if not exists topics_project_idx on public.topics (project_id);
create index if not exists topics_status_idx on public.topics (project_id, status);

create table if not exists public.site_plan_nodes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  parent_id uuid references public.site_plan_nodes(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  title text not null,
  intent text check (intent in ('informational','commercial','transactional','navigational')),
  suggested_template text,
  suggested_purpose text,
  provenance text not null default 'user' check (provenance in ('plan-sitemap','user','suggested-followup')),
  status text not null default 'adopted' check (status in ('suggested','adopted')),
  materialized_path text not null default '',
  position int not null default 0,
  rationale text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists site_plan_nodes_project_idx on public.site_plan_nodes (project_id);
create index if not exists site_plan_nodes_parent_idx on public.site_plan_nodes (parent_id);
create index if not exists site_plan_nodes_path_idx on public.site_plan_nodes (project_id, materialized_path);
create index if not exists site_plan_nodes_topic_idx on public.site_plan_nodes (topic_id) where topic_id is not null;

alter table public.site_plan_nodes drop constraint if exists site_plan_nodes_topic_root_only;
alter table public.site_plan_nodes
  add constraint site_plan_nodes_topic_root_only
  check (topic_id is null or parent_id is null);

create or replace function public.set_site_plan_node_path()
returns trigger
language plpgsql
as $$
declare
  parent_path text;
  depth int;
begin
  if new.parent_id is null then
    new.materialized_path := '/' || new.id::text;
  else
    select materialized_path into parent_path
      from public.site_plan_nodes where id = new.parent_id;
    if parent_path is null then
      raise exception 'parent_id % has no materialized_path', new.parent_id;
    end if;
    new.materialized_path := parent_path || '/' || new.id::text;
  end if;
  depth := array_length(string_to_array(trim(both '/' from new.materialized_path), '/'), 1);
  if depth > 3 then
    raise exception 'site plan tree depth capped at 3 (got %)', depth;
  end if;
  return new;
end;
$$;

drop trigger if exists site_plan_nodes_set_path on public.site_plan_nodes;
create trigger site_plan_nodes_set_path
  before insert or update of parent_id on public.site_plan_nodes
  for each row execute function public.set_site_plan_node_path();

create table if not exists public.redirects (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  from_path text not null,
  to_path text not null,
  status int not null default 301 check (status in (301, 302)),
  source text not null default 'manual' check (source in ('slug-rename','tree-move','page-delete','manual')),
  created_at timestamptz not null default now(),
  unique (project_id, from_path)
);

create index if not exists redirects_project_idx on public.redirects (project_id);

create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  site_plan_node_id uuid references public.site_plan_nodes(id) on delete set null,
  template_id text not null,
  purpose text not null check (purpose in ('home','content','landing','listing','contact','about')),
  status text not null default 'draft' check (status in ('draft','published')),
  mount_slug_at_publish text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pages_project_idx on public.pages (project_id);
create index if not exists pages_node_idx on public.pages (site_plan_node_id);
create index if not exists pages_status_idx on public.pages (project_id, status);

create table if not exists public.page_variants (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  locale text not null,
  slug text not null,
  title text not null,
  meta_description text,
  blocks jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  draft_updated_at timestamptz not null default now(),
  last_published_path text,
  unique (page_id, locale)
);

create index if not exists page_variants_page_idx on public.page_variants (page_id);
create index if not exists page_variants_locale_idx on public.page_variants (locale);

create table if not exists public.page_drafts (
  page_variant_id uuid primary key references public.page_variants(id) on delete cascade,
  blocks jsonb not null default '[]'::jsonb,
  saved_at timestamptz not null default now()
);

create table if not exists public.seed_keywords (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  keyword text not null,
  created_at timestamptz not null default now(),
  unique (project_id, keyword)
);

create index if not exists seed_keywords_project_idx on public.seed_keywords (project_id);

create table if not exists public.insights (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  app_id text not null,
  source text not null,
  type text not null,
  title text not null,
  opportunity text not null,
  evidence jsonb not null default '{}'::jsonb,
  confidence text not null check (confidence in ('low','medium','high')),
  topic_hint text,
  related_keywords text[] not null default '{}'::text[],
  related_urls text[] not null default '{}'::text[],
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  generated_by_run_id uuid references public.skill_runs(id) on delete set null
);

create index if not exists insights_project_idx on public.insights (project_id, app_id);
create index if not exists insights_topic_hint_idx on public.insights (project_id, topic_hint) where topic_hint is not null;
create index if not exists insights_active_idx on public.insights (project_id, app_id, created_at desc);

-- ============================================================================
-- 7. Triggers: auth user → profile; updated_at on every table that has it
-- ============================================================================

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for any existing auth.users rows that survived a prior
-- public-schema wipe. Without this, a re-install on a dirty Supabase project
-- leaves auth users without a matching profile, and the
-- `Add user → Create new user` step in the dashboard silently no-ops on
-- existing emails (no INSERT event = trigger never fires = no profile = RLS
-- rejects every write).
do $$
declare
  has_admin boolean;
  oldest_orphan_id uuid;
begin
  select exists(select 1 from public.profiles where is_admin = true)
    into has_admin;

  select u.id into oldest_orphan_id
  from auth.users u
  where u.email is not null
    and not exists(select 1 from public.profiles p where p.id = u.id)
  order by u.created_at asc
  limit 1;

  insert into public.profiles (id, email, full_name, role, is_admin)
  select
    u.id,
    u.email,
    coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
    'drafter',
    (not has_admin and u.id = oldest_orphan_id)
  from auth.users u
  where u.email is not null
    and not exists(select 1 from public.profiles p where p.id = u.id)
  on conflict (id) do nothing;
end $$;

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'profiles',
      'brands',
      'projects',
      'integrations',
      'icp_profiles',
      'articles',
      'content_sources',
      'topics',
      'site_plan_nodes',
      'pages'
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
-- 8. Row-level security
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.brands enable row level security;
alter table public.projects enable row level security;
alter table public.integrations enable row level security;
alter table public.activated_apps enable row level security;
alter table public.app_config enable row level security;
alter table public.icp_profiles enable row level security;
alter table public.articles enable row level security;
alter table public.keywords enable row level security;
alter table public.content_sources enable row level security;
alter table public.content_source_pages enable row level security;
alter table public.answer_public_entries enable row level security;
alter table public.project_data_freshness enable row level security;
alter table public.weekly_analyses enable row level security;
alter table public.skill_runs enable row level security;
alter table public.review_policy enable row level security;
alter table public.review_queue_items enable row level security;
alter table public.review_approvals enable row level security;
alter table public.topics enable row level security;
alter table public.site_plan_nodes enable row level security;
alter table public.redirects enable row level security;
alter table public.pages enable row level security;
alter table public.page_variants enable row level security;
alter table public.page_drafts enable row level security;
alter table public.seed_keywords enable row level security;
alter table public.insights enable row level security;

-- profiles
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

-- brands: read for all, write admin-only
drop policy if exists brands_read on public.brands;
create policy brands_read on public.brands
  for select to authenticated using (true);

drop policy if exists brands_write_admin on public.brands;
create policy brands_write_admin on public.brands
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- projects: read for all, write admin-only
drop policy if exists projects_read on public.projects;
create policy projects_read on public.projects
  for select to authenticated using (true);

drop policy if exists projects_write_admin on public.projects;
create policy projects_write_admin on public.projects
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- integrations: admin-only
drop policy if exists integrations_admin_all on public.integrations;
create policy integrations_admin_all on public.integrations
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- per-project tables: any signed-in user
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'activated_apps',
      'app_config',
      'icp_profiles',
      'articles',
      'keywords',
      'content_sources',
      'content_source_pages',
      'answer_public_entries',
      'project_data_freshness',
      'weekly_analyses',
      'skill_runs',
      'review_queue_items',
      'review_approvals',
      'topics',
      'site_plan_nodes',
      'redirects',
      'pages',
      'page_variants',
      'page_drafts',
      'seed_keywords',
      'insights'
    ])
  loop
    execute format('drop policy if exists %I on public.%I;', t || '_rw', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true);',
      t || '_rw', t
    );
  end loop;
end
$$;

-- review_policy: read for all, write admin-only
drop policy if exists review_policy_read on public.review_policy;
create policy review_policy_read on public.review_policy
  for select to authenticated using (true);

drop policy if exists review_policy_write_admin on public.review_policy;
create policy review_policy_write_admin on public.review_policy
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- 9. Storage buckets
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
