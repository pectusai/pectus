-- 0003_project_files.sql
-- Create the project-files storage bucket. Public read so the URLs produced
-- by Storage's getPublicUrl() work directly in img/href attributes without a
-- signing dance. Writes still require the service role (used by the CMS).
--
-- Idempotent: safe to re-run via the in-CMS migration overlay.

INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', true)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public;

insert into public._pectus_migrations (filename)
values ('0003_project_files.sql')
on conflict (filename) do nothing;
