-- 0005_rename_content_hub_to_insights.sql
-- Renames the content-hub app to content-insights everywhere it persists.
--
-- Idempotent: ALTERs run inside an information_schema check, so fresh
-- installs starting from v0.4.16's 0001 (already using the new names)
-- skip them. UPDATEs are conditional WHEREs.

do $$
begin
  -- projects table columns
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'projects' and column_name = 'content_hub_repo'
  ) then
    alter table public.projects rename column content_hub_repo to content_insights_repo;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'projects' and column_name = 'content_hub_branch'
  ) then
    alter table public.projects rename column content_hub_branch to content_insights_branch;
  end if;
end $$;

-- App registry rows: any project that activated the app under the old slug.
update public.activated_apps set app_name = 'content-insights' where app_name = 'content-hub';
update public.app_config     set app_name = 'content-insights' where app_name = 'content-hub';

insert into public._pectus_migrations (filename)
values ('0005_rename_content_hub_to_insights.sql')
on conflict (filename) do nothing;
