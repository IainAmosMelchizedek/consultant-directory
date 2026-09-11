-- ============================================================
-- 002_accreditors.sql
--
-- Public read-only access for the accreditors entity.
--
-- The accreditors table itself, its data, indexes, and foreign
-- key relationships are owned by etl.py so the database build
-- remains reproducible from the source workbook.
-- ============================================================


ALTER TABLE public.accreditors
ENABLE ROW LEVEL SECURITY;


REVOKE ALL
ON public.accreditors
FROM anon, authenticated;


GRANT SELECT
ON public.accreditors
TO anon, authenticated;


DROP POLICY IF EXISTS
    "Public read accreditors"
ON public.accreditors;


CREATE POLICY
    "Public read accreditors"
ON public.accreditors
FOR SELECT
TO anon, authenticated
USING (true);