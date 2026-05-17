-- 0007_gsc_pages.sql
-- Per-page aggregate from Search Console (impressions, clicks, position, CTR).
--
-- The auto-fetch pipeline writes per-(date, query, page) rows into gsc_daily
-- and per-query aggregates into keywords.metadata. There was no canonical
-- landing place for per-page aggregates, which is what the GSC "Pages" CSV
-- export produces. This table covers that gap and is also the future home
-- for fetch-pipeline page aggregates if we want them.
--
-- One row per (project_id, page). Idempotent insert via the unique
-- constraint; the CSV import upserts.

create table if not exists public.gsc_pages (
  id bigserial primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  page text not null,
  impressions int not null default 0,
  clicks int not null default 0,
  position numeric not null default 0,
  ctr numeric not null default 0,
  window_days int not null default 28,
  fetched_at timestamptz not null default now(),
  unique (project_id, page)
);

create index if not exists gsc_pages_project_idx
  on public.gsc_pages (project_id);

alter table public.gsc_pages enable row level security;

drop policy if exists gsc_pages_signed_in on public.gsc_pages;
create policy gsc_pages_signed_in on public.gsc_pages
  for all to authenticated using (true) with check (true);

grant select, insert, update, delete on public.gsc_pages to authenticated;
grant usage, select on sequence public.gsc_pages_id_seq to authenticated;

insert into public._pectus_migrations (filename)
values ('0007_gsc_pages.sql')
on conflict (filename) do nothing;
