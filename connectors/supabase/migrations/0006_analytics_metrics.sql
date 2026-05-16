-- 0006_analytics_metrics.sql
-- Cross-source time-series tables that inbound apps write into.
--
-- analytics_metrics is the shared shape every analytics-style inbound app
-- writes to: GA4 today, Google Ads / Meta / LinkedIn / Microsoft Ads later.
-- Skills read from one table regardless of source. A growth-dashboard
-- outbound app joins paid spend with organic conversions to compute blended
-- CPA across all sources.
--
-- gsc_daily is the per-(date, query, page) grain GSC writes for trend
-- analysis. The 28-day aggregate still lands in keywords.metadata; this is
-- the time-series companion.
--
-- Idempotent: create table if not exists, named indexes guarded the same way.

create table if not exists public.analytics_metrics (
  id bigserial primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  source text not null,
  date date not null,
  metric_name text not null,
  value numeric not null,
  dimensions jsonb not null default '{}'::jsonb,
  dimension_key text generated always as (md5(dimensions::text)) stored,
  fetched_at timestamptz not null default now(),
  unique (project_id, source, date, metric_name, dimension_key)
);

create index if not exists analytics_metrics_project_source_date_idx
  on public.analytics_metrics (project_id, source, date);
create index if not exists analytics_metrics_project_metric_idx
  on public.analytics_metrics (project_id, metric_name, date);

create table if not exists public.gsc_daily (
  id bigserial primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  date date not null,
  query text not null,
  page text not null,
  impressions int not null default 0,
  clicks int not null default 0,
  position numeric not null default 0,
  fetched_at timestamptz not null default now(),
  unique (project_id, date, query, page)
);

create index if not exists gsc_daily_project_date_idx
  on public.gsc_daily (project_id, date);
create index if not exists gsc_daily_project_query_idx
  on public.gsc_daily (project_id, query);

alter table public.analytics_metrics enable row level security;
alter table public.gsc_daily enable row level security;

drop policy if exists analytics_metrics_signed_in on public.analytics_metrics;
create policy analytics_metrics_signed_in on public.analytics_metrics
  for all to authenticated using (true) with check (true);

drop policy if exists gsc_daily_signed_in on public.gsc_daily;
create policy gsc_daily_signed_in on public.gsc_daily
  for all to authenticated using (true) with check (true);

grant select, insert, update, delete on public.analytics_metrics to authenticated;
grant select, insert, update, delete on public.gsc_daily to authenticated;
grant usage, select on sequence public.analytics_metrics_id_seq to authenticated;
grant usage, select on sequence public.gsc_daily_id_seq to authenticated;

insert into public._pectus_migrations (filename)
values ('0006_analytics_metrics.sql')
on conflict (filename) do nothing;
