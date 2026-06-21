
-- Evidence: add UPDATE/DELETE policies
CREATE POLICY "owners and staff update evidence"
ON public.evidence FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.reports r WHERE r.id = evidence.report_id AND (r.usuario_id = auth.uid() OR public.has_role(auth.uid(), 'fiscal'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))))
WITH CHECK (EXISTS (SELECT 1 FROM public.reports r WHERE r.id = evidence.report_id AND (r.usuario_id = auth.uid() OR public.has_role(auth.uid(), 'fiscal'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))));

CREATE POLICY "owners and staff delete evidence"
ON public.evidence FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.reports r WHERE r.id = evidence.report_id AND (r.usuario_id = auth.uid() OR public.has_role(auth.uid(), 'fiscal'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))));

-- Reports: add WITH CHECK to UPDATE policy to prevent ownership transfer
DROP POLICY IF EXISTS "users update own or fiscais" ON public.reports;
CREATE POLICY "users update own or fiscais"
ON public.reports FOR UPDATE TO authenticated
USING (
  (usuario_id IS NOT NULL AND auth.uid() = usuario_id)
  OR public.has_role(auth.uid(), 'fiscal'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  (usuario_id IS NOT NULL AND auth.uid() = usuario_id)
  OR public.has_role(auth.uid(), 'fiscal'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);
