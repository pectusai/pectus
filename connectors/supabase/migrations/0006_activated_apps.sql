-- 0006_activated_apps.sql
-- Pectus v0.3 — apps as plugins.
--
-- The CMS becomes a shell. Apps register their own surfaces. activated_apps
-- tracks which apps are turned on for the install; workspace_app_config holds
-- per-workspace app configuration for apps that need it.
--
-- Backfill: any v0.2 install that already had a workspace with mount_slug or
-- content_hub_repo set is auto-activated for content-hub so existing surfaces
-- (Articles, Pages, Site URL, Redirects) keep rendering after upgrade.
--
-- Idempotent and safe to re-run.

-- ---- activated_apps ----
-- Install-level. One row per activated app. Config holds settings that aren't
-- workspace-scoped (e.g., a default deploy target).
create table if not exists public.activated_apps (
  app_name text primary key,
  activated_at timestamptz not null default now(),
  config jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'paused'))
);

-- ---- workspace_app_config ----
-- Per-workspace app configuration. Apps that need workspace-scoped settings
-- (mount slug, repo, locale rules, etc.) write a row here per workspace they
-- run in. Cascade so deactivating an app or deleting a workspace cleans up.
create table if not exists public.workspace_app_config (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  app_name text not null references public.activated_apps(app_name) on delete cascade,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, app_name)
);

-- ---- RLS ----
-- Same pattern as the rest of the schema: any signed-in user with a profile
-- row can read/write. Multi-tenant isolation is not in scope for v0.x; a
-- single Pectus install is one team.
alter table public.activated_apps enable row level security;
alter table public.workspace_app_config enable row level security;

drop policy if exists "activated_apps readable by signed in" on public.activated_apps;
create policy "activated_apps readable by signed in"
  on public.activated_apps for select
  using (auth.uid() is not null);

drop policy if exists "activated_apps writable by signed in" on public.activated_apps;
create policy "activated_apps writable by signed in"
  on public.activated_apps for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "workspace_app_config readable by signed in" on public.workspace_app_config;
create policy "workspace_app_config readable by signed in"
  on public.workspace_app_config for select
  using (auth.uid() is not null);

drop policy if exists "workspace_app_config writable by signed in" on public.workspace_app_config;
create policy "workspace_app_config writable by signed in"
  on public.workspace_app_config for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- ---- Backfill: auto-activate content-hub for v0.2 installs ----
-- Only activate if at least one workspace has content-hub-shaped fields set.
-- Without this, upgrading from v0.2 would silently hide Articles/Pages tabs.
do $$
declare
  has_content_hub boolean;
begin
  select exists (
    select 1 from public.workspaces
    where (mount_slug is not null and mount_slug <> '')
       or (content_hub_repo is not null and content_hub_repo <> '')
  ) into has_content_hub;

  if has_content_hub then
    insert into public.activated_apps (app_name, config)
    values ('content-hub', '{}'::jsonb)
    on conflict (app_name) do nothing;

    insert into public.workspace_app_config (workspace_id, app_name, config)
    select
      w.id,
      'content-hub',
      jsonb_strip_nulls(jsonb_build_object(
        'mount_slug', w.mount_slug,
        'content_hub_repo', w.content_hub_repo,
        'content_hub_branch', w.content_hub_branch
      ))
    from public.workspaces w
    where (w.mount_slug is not null and w.mount_slug <> '')
       or (w.content_hub_repo is not null and w.content_hub_repo <> '')
    on conflict (workspace_id, app_name) do nothing;
  end if;
end
$$;
