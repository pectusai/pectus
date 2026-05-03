-- 0002_v0_2_pages.sql
-- Pectus v0.2 — Content Hub as website builder.
-- Adds: topics, site_plan_nodes (with materialized_path), redirects,
-- pages, page_variants, page_drafts, seed_keywords.
-- Alters workspaces with mode, locale config, mount slug, content-hub repo.
-- Idempotent and safe to re-run.

-- ============================================================================
-- 1. Workspace alterations
-- ============================================================================

-- Note: an earlier draft of 0002 added a `mode` column ('seed' / 'live') to switch
-- weekly-analysis input source. The insights architecture (migration 0003) made
-- that obsolete: every connected source produces Insights additively, no fallback
-- toggle needed. Column intentionally not added.
alter table public.workspaces add column if not exists default_locale text not null default 'en';
alter table public.workspaces add column if not exists enabled_locales text[] not null default array['en']::text[];
alter table public.workspaces add column if not exists default_locale_skips_prefix boolean not null default true;
alter table public.workspaces add column if not exists mount_slug text not null default '/';
alter table public.workspaces add column if not exists content_hub_repo text;
alter table public.workspaces add column if not exists content_hub_branch text not null default 'main';

-- Backfill: copy existing single-locale into default_locale + enabled_locales for older rows.
update public.workspaces
   set default_locale = locale,
       enabled_locales = array[locale]
 where default_locale = 'en' and locale is not null and locale <> 'en';

-- ============================================================================
-- 2. Topics
-- ============================================================================

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  intent text check (intent in ('informational','commercial','transactional','navigational')),
  source text not null default 'analysis-suggested' check (source in ('analysis-suggested','user')),
  status text not null default 'unfulfilled' check (status in ('unfulfilled','planned','published')),
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create index if not exists topics_workspace_idx on public.topics (workspace_id);
create index if not exists topics_status_idx on public.topics (workspace_id, status);

-- ============================================================================
-- 3. Site plan nodes (the tree)
-- ============================================================================

create table if not exists public.site_plan_nodes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
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

create index if not exists site_plan_nodes_workspace_idx on public.site_plan_nodes (workspace_id);
create index if not exists site_plan_nodes_parent_idx on public.site_plan_nodes (parent_id);
create index if not exists site_plan_nodes_path_idx on public.site_plan_nodes (workspace_id, materialized_path);
create index if not exists site_plan_nodes_topic_idx on public.site_plan_nodes (topic_id) where topic_id is not null;

-- topic_id is only allowed on root nodes (parent_id IS NULL).
alter table public.site_plan_nodes drop constraint if exists site_plan_nodes_topic_root_only;
alter table public.site_plan_nodes
  add constraint site_plan_nodes_topic_root_only
  check (topic_id is null or parent_id is null);

-- Materialized path maintenance: recompute on insert and on parent change.
-- Path format: '/<root_id>/<child_id>/<grandchild_id>'. Lets us query an
-- entire subtree with `materialized_path LIKE '/<root_id>/%'`.
create or replace function public.set_site_plan_node_path()
returns trigger
language plpgsql
as $$
declare
  parent_path text;
  computed text;
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

  -- Enforce depth cap (3 levels: root + child + grandchild).
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

-- ============================================================================
-- 4. Redirects
-- ============================================================================

create table if not exists public.redirects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  from_path text not null,
  to_path text not null,
  status int not null default 301 check (status in (301, 302)),
  source text not null default 'manual' check (source in ('slug-rename','tree-move','page-delete','manual')),
  created_at timestamptz not null default now(),
  unique (workspace_id, from_path)
);

create index if not exists redirects_workspace_idx on public.redirects (workspace_id);

-- ============================================================================
-- 5. Pages, variants, drafts
-- ============================================================================

create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  site_plan_node_id uuid references public.site_plan_nodes(id) on delete set null,
  template_id text not null,
  purpose text not null check (purpose in ('home','content','landing','listing','contact','about')),
  status text not null default 'draft' check (status in ('draft','published')),
  mount_slug_at_publish text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pages_workspace_idx on public.pages (workspace_id);
create index if not exists pages_node_idx on public.pages (site_plan_node_id);
create index if not exists pages_status_idx on public.pages (workspace_id, status);

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
  unique (page_id, locale)
);

create index if not exists page_variants_page_idx on public.page_variants (page_id);
create index if not exists page_variants_locale_idx on public.page_variants (locale);

create table if not exists public.page_drafts (
  page_variant_id uuid primary key references public.page_variants(id) on delete cascade,
  blocks jsonb not null default '[]'::jsonb,
  saved_at timestamptz not null default now()
);

-- ============================================================================
-- 6. Seed keywords (greenfield mode)
-- ============================================================================

create table if not exists public.seed_keywords (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  keyword text not null,
  created_at timestamptz not null default now(),
  unique (workspace_id, keyword)
);

create index if not exists seed_keywords_workspace_idx on public.seed_keywords (workspace_id);

-- ============================================================================
-- 7. updated_at triggers for new tables
-- ============================================================================

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
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
-- 8. RLS
-- ============================================================================

alter table public.topics enable row level security;
alter table public.site_plan_nodes enable row level security;
alter table public.redirects enable row level security;
alter table public.pages enable row level security;
alter table public.page_variants enable row level security;
alter table public.page_drafts enable row level security;
alter table public.seed_keywords enable row level security;

drop policy if exists topics_rw on public.topics;
create policy topics_rw on public.topics for all to authenticated using (true) with check (true);

drop policy if exists site_plan_nodes_rw on public.site_plan_nodes;
create policy site_plan_nodes_rw on public.site_plan_nodes for all to authenticated using (true) with check (true);

drop policy if exists redirects_rw on public.redirects;
create policy redirects_rw on public.redirects for all to authenticated using (true) with check (true);

drop policy if exists pages_rw on public.pages;
create policy pages_rw on public.pages for all to authenticated using (true) with check (true);

drop policy if exists page_variants_rw on public.page_variants;
create policy page_variants_rw on public.page_variants for all to authenticated using (true) with check (true);

drop policy if exists page_drafts_rw on public.page_drafts;
create policy page_drafts_rw on public.page_drafts for all to authenticated using (true) with check (true);

drop policy if exists seed_keywords_rw on public.seed_keywords;
create policy seed_keywords_rw on public.seed_keywords for all to authenticated using (true) with check (true);
