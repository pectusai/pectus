-- 0004_brand_font_sizes.sql
-- Add font_sizes (jsonb) to brands so the user can override heading and body
-- sizes from the brand profile UI. Without this, the only knobs are font
-- families — the edit-page chat had to refuse "make the H1 bigger" requests
-- because there was nowhere to set the value.
--
-- Idempotent.

ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS font_sizes jsonb NOT NULL DEFAULT '{}'::jsonb;
