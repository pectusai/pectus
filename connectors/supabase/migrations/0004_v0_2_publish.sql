-- 0004_v0_2_publish.sql
-- Pectus v0.2 — Publish bookkeeping.
--
-- Tracks the last URL each page_variant was published at so the publish flow
-- can detect slug renames and tree moves and emit redirect rows automatically.
--
-- Idempotent and safe to re-run.

alter table public.page_variants
  add column if not exists last_published_path text;

comment on column public.page_variants.last_published_path is
  'The URL path under which this variant was most recently published. Compared at publish time against the freshly-resolved path; any difference enqueues a redirect row.';
