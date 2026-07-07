-- 1) Prevent reassigning report ownership via trigger
CREATE OR REPLACE FUNCTION public.prevent_reports_usuario_id_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.usuario_id IS DISTINCT FROM OLD.usuario_id THEN
    RAISE EXCEPTION 'Não é permitido alterar o proprietário da denúncia (usuario_id).';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_reports_usuario_id_change ON public.reports;
CREATE TRIGGER trg_prevent_reports_usuario_id_change
BEFORE UPDATE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.prevent_reports_usuario_id_change();

-- 2) Add UPDATE policies on storage.objects for the 'evidence' bucket, mirroring DELETE pattern.
-- Owners and fiscais/admins may update; nobody else.
DROP POLICY IF EXISTS "evidence owners or staff can update" ON storage.objects;
CREATE POLICY "evidence owners or staff can update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'evidence' AND (
    owner = auth.uid()
    OR public.has_role(auth.uid(), 'fiscal')
    OR public.has_role(auth.uid(), 'admin')
  )
)
WITH CHECK (
  bucket_id = 'evidence' AND (
    owner = auth.uid()
    OR public.has_role(auth.uid(), 'fiscal')
    OR public.has_role(auth.uid(), 'admin')
  )
);
