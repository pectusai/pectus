-- 0003_v0_2_insights.sql
-- Pectus v0.2 — Insights table.
--
-- Each inbound app's interpretation skill produces rows here. Consumers
-- (weekly-analysis, plan-sitemap) read from this table instead of running
-- interpretations inline. See pectusai-private/v0.2-content-hub-plan.md
-- "Insights architecture" section for the full design.
--
-- Idempotent and safe to re-run.

create table if not exists public.insights (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  app_id text not null,           -- 'gsc' | 'ga4' | 'seed-keywords' | etc.
  source text not null,           -- redundant with app_id but stable in JSON output
  type text not null,             -- per-app controlled vocab (e.g. 'topic_candidate')
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

create index if not exists insights_workspace_idx on public.insights (workspace_id, app_id);
create index if not exists insights_topic_hint_idx on public.insights (workspace_id, topic_hint) where topic_hint is not null;
create index if not exists insights_active_idx on public.insights (workspace_id, app_id, created_at desc);

alter table public.insights enable row level security;

drop policy if exists insights_rw on public.insights;
create policy insights_rw on public.insights for all to authenticated using (true) with check (true);
