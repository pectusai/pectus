-- 0002_content_hub.sql
-- Content Hub upgrade: status transitions, weekly analysis triplet,
-- idea dismissals, llm usage logging, and content_sources extras.
-- Idempotent. Safe to re-run.

-- ── article_transitions ────────────────────────────────────────────────────
create table if not exists public.article_transitions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  from_status text,
  to_status text not null,
  note text,
  actor uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists article_transitions_article_idx
  on public.article_transitions (article_id, created_at desc);

alter table public.article_transitions enable row level security;

drop policy if exists article_transitions_admin_all on public.article_transitions;
create policy article_transitions_admin_all on public.article_transitions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ── data_snapshots ─────────────────────────────────────────────────────────
create table if not exists public.data_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  fetched_at timestamptz not null default now(),
  fetched_by uuid references auth.users(id),
  status text not null check (status in ('running','done','failed','partial')),
  sources jsonb not null default '{}'::jsonb,
  error_message text,
  duration_ms int
);

create index if not exists data_snapshots_project_recent_idx
  on public.data_snapshots (project_id, fetched_at desc);

alter table public.data_snapshots enable row level security;

drop policy if exists data_snapshots_admin_all on public.data_snapshots;
create policy data_snapshots_admin_all on public.data_snapshots
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ── data_interpretations ───────────────────────────────────────────────────
create table if not exists public.data_interpretations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  snapshot_id uuid not null references public.data_snapshots(id) on delete cascade,
  interpreted_at timestamptz not null default now(),
  interpreted_by uuid references auth.users(id),
  status text not null check (status in ('running','done','failed')),
  interpretation jsonb,
  error_message text,
  duration_ms int
);

create index if not exists data_interpretations_project_recent_idx
  on public.data_interpretations (project_id, interpreted_at desc);

alter table public.data_interpretations enable row level security;

drop policy if exists data_interpretations_admin_all on public.data_interpretations;
create policy data_interpretations_admin_all on public.data_interpretations
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ── idea_generations ───────────────────────────────────────────────────────
create table if not exists public.idea_generations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  interpretation_id uuid not null references public.data_interpretations(id) on delete cascade,
  generated_at timestamptz not null default now(),
  generated_by uuid references auth.users(id),
  status text not null check (status in ('running','done','failed')),
  ideas jsonb,
  error_message text,
  duration_ms int
);

create index if not exists idea_generations_project_recent_idx
  on public.idea_generations (project_id, generated_at desc);

alter table public.idea_generations enable row level security;

drop policy if exists idea_generations_admin_all on public.idea_generations;
create policy idea_generations_admin_all on public.idea_generations
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ── idea_post_dismissals ───────────────────────────────────────────────────
create table if not exists public.idea_post_dismissals (
  project_id uuid not null references public.projects(id) on delete cascade,
  generation_id uuid not null references public.idea_generations(id) on delete cascade,
  post_index int not null,
  dismissed_at timestamptz not null default now(),
  dismissed_by uuid references auth.users(id),
  primary key (project_id, generation_id, post_index)
);

alter table public.idea_post_dismissals enable row level security;

drop policy if exists idea_post_dismissals_admin_all on public.idea_post_dismissals;
create policy idea_post_dismissals_admin_all on public.idea_post_dismissals
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ── llm_usage ──────────────────────────────────────────────────────────────
create table if not exists public.llm_usage (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  user_id uuid references auth.users(id),
  provider text not null,
  model text not null,
  surface text not null,
  input_tokens int,
  output_tokens int,
  cache_read_tokens int,
  cache_write_tokens int,
  images_generated int,
  cost_usd numeric(10,6) not null default 0,
  latency_ms int,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists llm_usage_project_month_idx
  on public.llm_usage (project_id, created_at desc);

alter table public.llm_usage enable row level security;

drop policy if exists llm_usage_admin_all on public.llm_usage;
create policy llm_usage_admin_all on public.llm_usage
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ── content_sources extras for reference-doc surface ───────────────────────
alter table public.content_sources add column if not exists title text;
alter table public.content_sources add column if not exists url text;
alter table public.content_sources add column if not exists body text;
alter table public.content_sources alter column sitemap_url drop not null;
alter table public.content_sources alter column name drop not null;

-- ── self-record so the in-app updates page sees this as applied ────────────
insert into public._pectus_migrations (filename)
values ('0002_content_hub.sql')
on conflict (filename) do nothing;
