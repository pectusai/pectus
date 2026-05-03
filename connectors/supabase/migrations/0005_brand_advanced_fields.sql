-- 0005_brand_advanced_fields.sql
-- Pectus brand profile — Advanced subset.
--
-- Adds duotone accent, multiple surface levels, semantic colors, mono font,
-- radius preference, and import provenance. All nullable so existing rows
-- (and manually built brands) keep working unchanged.
--
-- Idempotent and safe to re-run.

alter table public.brand_profile add column if not exists accent_alt text;
alter table public.brand_profile add column if not exists accent_alt_ink text;
alter table public.brand_profile add column if not exists surface_alt text;
alter table public.brand_profile add column if not exists surface_inv text;
alter table public.brand_profile add column if not exists color_ok text;
alter table public.brand_profile add column if not exists color_warn text;
alter table public.brand_profile add column if not exists color_err text;
alter table public.brand_profile add column if not exists font_mono jsonb;
alter table public.brand_profile add column if not exists radius text default 'default';
alter table public.brand_profile add column if not exists imported_from jsonb;
