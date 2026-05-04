-- 0008_slug_unaccent.sql
-- Pectus v0.4.1 — Fix _slugify Unicode handling.
--
-- The v0.4.0 _slugify did not strip diacritics, so "Aström" became
-- "astr-m" instead of "astrom". The CLI's TS slugify uses NFKD +
-- combining-mark stripping, producing "astrom" — the disk dir was
-- written under one slug and the DB row under another, breaking
-- /brands/<slug>/ routing.
--
-- This migration replaces _slugify with an unaccent-based version
-- that matches the CLI, then re-slugifies every existing brand row
-- so the DB slug matches the disk dir.
--
-- Idempotent and safe to re-run.

create extension if not exists unaccent;

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

-- Re-slugify every existing brand whose stored slug no longer matches
-- the canonical form. No-op when slugs are already correct.
update public.brands
set slug = public._slugify(name)
where slug is distinct from public._slugify(name);
