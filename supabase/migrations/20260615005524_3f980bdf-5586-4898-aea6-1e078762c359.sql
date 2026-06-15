
-- 1) REPORTS: drop public SELECT
DROP POLICY IF EXISTS "anyone view reports" ON public.reports;

CREATE POLICY "owners and staff view reports"
ON public.reports
FOR SELECT
TO authenticated
USING (
  auth.uid() = usuario_id
  OR public.has_role(auth.uid(), 'fiscal'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Public anonymized projection via SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.list_public_reports(_limit int DEFAULT 50)
RETURNS TABLE (
  id uuid,
  tipo_ocorrencia occurrence_type,
  status report_status,
  bairro text,
  criado_em timestamptz,
  latitude numeric,
  longitude numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, tipo_ocorrencia, status, bairro, criado_em, latitude, longitude
  FROM public.reports
  ORDER BY criado_em DESC
  LIMIT GREATEST(LEAST(_limit, 200), 1);
$$;

REVOKE ALL ON FUNCTION public.list_public_reports(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_reports(int) TO anon, authenticated;

-- 2) ORGAOS
DROP POLICY IF EXISTS "anyone view orgaos" ON public.orgaos;

CREATE POLICY "authenticated view orgaos"
ON public.orgaos
FOR SELECT
TO authenticated
USING (true);

-- 3) USER_ROLES: admin-only writes
CREATE POLICY "admins insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4) STORAGE evidence read: scope to owner/fiscal/admin by folder prefix
DROP POLICY IF EXISTS "auth read evidence" ON storage.objects;

CREATE POLICY "owners and staff read evidence"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'evidence'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.has_role(auth.uid(), 'fiscal'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);
