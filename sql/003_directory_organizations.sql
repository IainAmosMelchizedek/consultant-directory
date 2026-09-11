-- ============================================================
-- 003_directory_organizations.sql
--
-- Public read-only access for the unified Consultant Directory
-- view.
--
-- The view definition itself is owned by etl.py so the
-- database build remains reproducible.
--
-- directory_organizations uses security_invoker = true, so
-- access to underlying tables continues to respect their
-- existing permissions and row-level security policies.
-- ============================================================


REVOKE ALL
ON public.directory_organizations
FROM anon, authenticated;


GRANT SELECT
ON public.directory_organizations
TO anon, authenticated;