-- 0007_v0_4_multi_brand.sql
-- Pectus v0.4 — Multi-brand container.
--
-- Renames brand_profile → brands. Drops the singleton constraint, adds slug.
-- Adds brand_id FK + ON DELETE CASCADE to every brand-scoped table.
-- Auto-creates one default brand from existing brand_profile row (slugified
-- from name) and backfills brand_id on every existing row.
--
-- After this migration:
--   - public.brands replaces public.brand_profile
--   - workspaces.code becomes unique per (brand_id, code), not globally
--   - integrations.provider becomes unique per (brand_id, provider)
--
-- Idempotent and safe to re-run.

-- ============================================================================
-- 1. Slugify helper
-- ============================================================================

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
  s := lower(input);
  s := regexp_replace(s, '[^a-z0-9]+', '-', 'g');
  s := regexp_replace(s, '^-+|-+$', '', 'g');
  if s = '' or s is null then return 'default'; end if;
  return s;
end
$$;

-- ============================================================================
-- 2. Rename brand_profile → brands; drop singleton; add slug + created_at.
-- ============================================================================

alter table if exists public.brand_profile rename to brands;

drop index if exists brand_profile_singleton_idx;

alter table public.brands add column if not exists slug text;
alter table public.brands add column if not exists created_at timestamptz not null default now();

-- Backfill slug; create a default brand row if the table is empty.
do $$
declare
  existing_id uuid;
  existing_name text;
begin
  select id, name into existing_id, existing_name
  from public.brands
  limit 1;

  if existing_id is null then
    insert into public.brands (slug, name)
    values ('default', 'Default brand');
  else
    update public.brands
       set slug = public._slugify(coalesce(name, 'default'))
     where slug is null;
  end if;
end
$$;

alter table public.brands alter column slug set not null;
create unique index if not exists brands_slug_idx on public.brands (slug);

alter table public.brands drop column if exists singleton;

-- Drop the old admin-only RLS policy named after brand_profile and recreate
-- against the new table name.
drop policy if exists brand_profile_read on public.brands;
drop policy if exists brand_profile_write_admin on public.brands;

drop policy if exists brands_read on public.brands;
create policy brands_read on public.brands
  for select to authenticated using (true);

drop policy if exists brands_write_admin on public.brands;
create policy brands_write_admin on public.brands
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- updated_at trigger now lives on brands (was on brand_profile).
drop trigger if exists set_updated_at on public.brands;
create trigger set_updated_at before update on public.brands
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 3. Add brand_id FK to every brand-scoped table; backfill; constrain.
-- ============================================================================

do $$
declare
  default_brand_id uuid;
  t text;
  brand_scoped text[] := array[
    'workspaces',
    'integrations',
    'workspace_app_config',
    'articles',
    'icp_profiles',
    'keywords',
    'content_sources',
    'answer_public_entries',
    'workspace_data_freshness',
    'weekly_analyses',
    'skill_runs',
    'review_policy',
    'review_queue_items',
    'topics',
    'site_plan_nodes',
    'redirects',
    'pages',
    'seed_keywords',
    'insights'
  ];
begin
  select id into default_brand_id from public.brands order by created_at, id limit 1;
  if default_brand_id is null then
    raise exception 'cannot backfill brand_id: no brand row exists';
  end if;

  foreach t in array brand_scoped loop
    execute format(
      'alter table public.%I add column if not exists brand_id uuid references public.brands(id) on delete cascade',
      t
    );
    execute format(
      'update public.%I set brand_id = %L where brand_id is null',
      t, default_brand_id
    );
    execute format(
      'alter table public.%I alter column brand_id set not null',
      t
    );
    execute format(
      'create index if not exists %I on public.%I (brand_id)',
      t || '_brand_idx', t
    );
  end loop;
end
$$;

-- ============================================================================
-- 4. Re-scope unique constraints that were globally unique but should be
--    per-brand under multi-brand.
-- ============================================================================

-- workspaces.code: globally unique → unique per (brand_id, code)
alter table public.workspaces drop constraint if exists workspaces_code_key;
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'workspaces_brand_code_key'
      and conrelid = 'public.workspaces'::regclass
  ) then
    alter table public.workspaces
      add constraint workspaces_brand_code_key unique (brand_id, code);
  end if;
end
$$;

-- integrations.provider: globally unique → unique per (brand_id, provider)
alter table public.integrations drop constraint if exists integrations_provider_key;
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'integrations_brand_provider_key'
      and conrelid = 'public.integrations'::regclass
  ) then
    alter table public.integrations
      add constraint integrations_brand_provider_key unique (brand_id, provider);
  end if;
end
$$;
