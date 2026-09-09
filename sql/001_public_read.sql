-- Consultant Directory
-- Public read-only access for Supabase Data API

-- Ensure Row Level Security is enabled.
ALTER TABLE public.institute_campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accreditation_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accreditation_actions ENABLE ROW LEVEL SECURITY;

-- Start from an explicit permission baseline.
-- Browser/API users may read, but may not insert, update, or delete.
REVOKE ALL ON TABLE public.institute_campuses
FROM anon, authenticated;

REVOKE ALL ON TABLE public.accreditation_records
FROM anon, authenticated;

REVOKE ALL ON TABLE public.accreditation_actions
FROM anon, authenticated;

-- Expose the complete tables through the Supabase Data API as read-only.
GRANT SELECT ON TABLE public.institute_campuses
TO anon, authenticated;

GRANT SELECT ON TABLE public.accreditation_records
TO anon, authenticated;

GRANT SELECT ON TABLE public.accreditation_actions
TO anon, authenticated;

-- Make the script safe to run again later.
DROP POLICY IF EXISTS "Public read institute campuses"
ON public.institute_campuses;

DROP POLICY IF EXISTS "Public read accreditation records"
ON public.accreditation_records;

DROP POLICY IF EXISTS "Public read accreditation actions"
ON public.accreditation_actions;

-- Every visitor may read every row and every column.
CREATE POLICY "Public read institute campuses"
ON public.institute_campuses
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Public read accreditation records"
ON public.accreditation_records
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Public read accreditation actions"
ON public.accreditation_actions
FOR SELECT
TO anon, authenticated
USING (true);