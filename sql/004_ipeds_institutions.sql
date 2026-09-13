-- ============================================================
-- 004_ipeds_institutions.sql
--
-- Public read-only access for the IPEDS institutions entity.
--
-- The ipeds_institutions table itself and its data are owned by
-- etl.py so the database build remains reproducible from the
-- committed IPEDS source file.
-- ============================================================


ALTER TABLE public.ipeds_institutions
ENABLE ROW LEVEL SECURITY;


REVOKE ALL
ON public.ipeds_institutions
FROM anon, authenticated;


GRANT SELECT
ON public.ipeds_institutions
TO anon, authenticated;


DROP POLICY IF EXISTS
    "Public read IPEDS institutions"
ON public.ipeds_institutions;


CREATE POLICY
    "Public read IPEDS institutions"
ON public.ipeds_institutions
FOR SELECT
TO anon, authenticated
USING (true);
