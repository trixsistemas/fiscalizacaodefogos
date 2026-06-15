
-- Allow anonymous reports
ALTER TABLE public.reports ALTER COLUMN usuario_id DROP NOT NULL;

-- Replace SELECT policy: anonymous reports (usuario_id IS NULL) are only
-- visible to fiscais/admins via the table; the public still sees them through
-- the anonymized list_public_reports RPC.
DROP POLICY IF EXISTS "owners and staff view reports" ON public.reports;

CREATE POLICY "owners and staff view reports"
ON public.reports
FOR SELECT
TO authenticated
USING (
  (usuario_id IS NOT NULL AND auth.uid() = usuario_id)
  OR public.has_role(auth.uid(), 'fiscal'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Public RPC to create an anonymous report. SECURITY DEFINER so anon role can
-- write without a broad INSERT policy. Validates field lengths to prevent
-- abuse and pins coordinates as numeric.
CREATE OR REPLACE FUNCTION public.create_anonymous_report(
  _tipo occurrence_type,
  _latitude numeric,
  _longitude numeric,
  _descricao text DEFAULT NULL,
  _bairro text DEFAULT NULL,
  _endereco text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  IF _latitude IS NULL OR _longitude IS NULL THEN
    RAISE EXCEPTION 'Coordenadas obrigatórias';
  END IF;
  IF _latitude < -90 OR _latitude > 90 OR _longitude < -180 OR _longitude > 180 THEN
    RAISE EXCEPTION 'Coordenadas inválidas';
  END IF;
  IF length(coalesce(_descricao,'')) > 2000 THEN
    RAISE EXCEPTION 'Descrição muito longa';
  END IF;
  IF length(coalesce(_bairro,'')) > 120 THEN
    RAISE EXCEPTION 'Bairro muito longo';
  END IF;
  IF length(coalesce(_endereco,'')) > 250 THEN
    RAISE EXCEPTION 'Endereço muito longo';
  END IF;

  INSERT INTO public.reports (
    usuario_id, tipo_ocorrencia, latitude, longitude,
    descricao, bairro, endereco
  )
  VALUES (
    NULL, _tipo, _latitude, _longitude,
    nullif(trim(_descricao), ''),
    nullif(trim(_bairro), ''),
    nullif(trim(_endereco), '')
  )
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_anonymous_report(occurrence_type, numeric, numeric, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_anonymous_report(occurrence_type, numeric, numeric, text, text, text) TO anon, authenticated;
