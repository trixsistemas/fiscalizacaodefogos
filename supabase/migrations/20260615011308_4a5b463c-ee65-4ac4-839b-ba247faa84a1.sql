
INSERT INTO public.orgaos (nome, cidade, estado, contato, ativo)
SELECT 'Guarda Municipal de Moreno', 'Moreno', 'PE', 'guardamunicipal@moreno.pe.gov.br', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.orgaos WHERE nome = 'Guarda Municipal de Moreno' AND cidade = 'Moreno'
);

CREATE OR REPLACE FUNCTION public.assign_default_orgao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _orgao uuid;
BEGIN
  IF NEW.orgao_id IS NULL THEN
    SELECT id INTO _orgao FROM public.orgaos
    WHERE nome = 'Guarda Municipal de Moreno' AND cidade = 'Moreno' AND ativo = true
    LIMIT 1;
    NEW.orgao_id := _orgao;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reports_assign_orgao ON public.reports;
CREATE TRIGGER reports_assign_orgao
BEFORE INSERT ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.assign_default_orgao();

UPDATE public.reports
SET orgao_id = (SELECT id FROM public.orgaos WHERE nome = 'Guarda Municipal de Moreno' AND cidade = 'Moreno' LIMIT 1)
WHERE orgao_id IS NULL;
