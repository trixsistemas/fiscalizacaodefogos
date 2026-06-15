
CREATE TYPE public.app_role AS ENUM ('cidadao', 'fiscal', 'admin');
CREATE TYPE public.report_status AS ENUM ('em_analise', 'confirmada', 'arquivada', 'falsa');
CREATE TYPE public.occurrence_type AS ENUM ('fogo_com_estampido', 'fogo_silencioso', 'rojao', 'bateria_fogos', 'outro');
CREATE TYPE public.evidence_type AS ENUM ('foto', 'video', 'audio');
CREATE TYPE public.inspection_result AS ENUM ('confirmado', 'nao_confirmado', 'inconclusivo');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome varchar(150) NOT NULL,
  email varchar(255) NOT NULL,
  telefone varchar(20),
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE public.orgaos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome varchar(150) NOT NULL,
  cidade varchar(120) NOT NULL,
  estado varchar(2) NOT NULL,
  contato varchar(150),
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.orgaos TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.orgaos TO authenticated;
GRANT ALL ON public.orgaos TO service_role;
ALTER TABLE public.orgaos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone view orgaos" ON public.orgaos FOR SELECT USING (true);
CREATE POLICY "admin manage orgaos" ON public.orgaos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo_ocorrencia occurrence_type NOT NULL DEFAULT 'fogo_com_estampido',
  descricao text,
  latitude decimal(10,7) NOT NULL,
  longitude decimal(10,7) NOT NULL,
  endereco text,
  bairro varchar(120),
  status report_status NOT NULL DEFAULT 'em_analise',
  orgao_id uuid REFERENCES public.orgaos(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT SELECT ON public.reports TO anon;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone view reports" ON public.reports FOR SELECT USING (true);
CREATE POLICY "users create own reports" ON public.reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "users update own or fiscais" ON public.reports FOR UPDATE TO authenticated
  USING (auth.uid() = usuario_id OR public.has_role(auth.uid(),'fiscal') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "users delete own or admin" ON public.reports FOR DELETE TO authenticated
  USING (auth.uid() = usuario_id OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  tipo evidence_type NOT NULL,
  arquivo_url text NOT NULL,
  ai_classe text,
  ai_confianca decimal(5,4),
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.evidence TO authenticated;
GRANT ALL ON public.evidence TO service_role;
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view evidence" ON public.evidence FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id
    AND (r.usuario_id = auth.uid() OR public.has_role(auth.uid(),'fiscal') OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "insert own evidence" ON public.evidence FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id AND r.usuario_id = auth.uid()));

CREATE TABLE public.inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  fiscal_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  observacao text,
  resultado inspection_result NOT NULL,
  data_fiscalizacao timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.inspections TO authenticated;
GRANT ALL ON public.inspections TO service_role;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view inspections" ON public.inspections FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'fiscal') OR public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id AND r.usuario_id = auth.uid()));
CREATE POLICY "fiscais create inspections" ON public.inspections FOR INSERT TO authenticated
  WITH CHECK ((public.has_role(auth.uid(),'fiscal') OR public.has_role(auth.uid(),'admin')) AND fiscal_id = auth.uid());

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.atualizado_em = now(); RETURN NEW; END; $$;
CREATE TRIGGER reports_touch BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, telefone)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.email,
    NEW.raw_user_meta_data->>'telefone');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'cidadao');
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
