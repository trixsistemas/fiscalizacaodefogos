import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Shield, MapPin, Mail, Inbox } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ReportListItem } from "@/components/reports/ReportListItem";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import type { ReportStatus } from "@/lib/labels";

const ORGAO_NOME = "Guarda Municipal de Moreno";
const ORGAO_CIDADE = "Moreno";

export const Route = createFileRoute("/_authenticated/guarda-moreno")({
  head: () => ({
    meta: [
      { title: "Guarda Municipal de Moreno — Recebimento de denúncias" },
      {
        name: "description",
        content:
          "Painel de recebimento de denúncias da Guarda Municipal de Moreno (PE).",
      },
    ],
  }),
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const allowed = roles?.some((r) => r.role === "fiscal" || r.role === "admin");
    if (!allowed) throw redirect({ to: "/" });
  },
  component: GuardaMoreno,
});

function GuardaMoreno() {
  const { data: orgao } = useQuery({
    queryKey: ["orgao", ORGAO_NOME, ORGAO_CIDADE],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orgaos")
        .select("id, nome, cidade, estado, contato")
        .eq("nome", ORGAO_NOME)
        .eq("cidade", ORGAO_CIDADE)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: reports, isLoading } = useQuery({
    enabled: !!orgao?.id,
    queryKey: ["reports", "orgao", orgao?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("id, tipo_ocorrencia, status, bairro, criado_em")
        .eq("orgao_id", orgao!.id)
        .order("criado_em", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const list = reports ?? [];
  const filterBy = (s: ReportStatus | "todas") =>
    s === "todas" ? list : list.filter((r) => r.status === s);

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <header className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-xl bg-brand/10 ring-1 ring-brand/30 flex items-center justify-center">
              <Shield className="size-6 text-brand" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                Órgão receptor
              </p>
              <h1 className="text-2xl md:text-3xl font-display leading-tight">
                Guarda Municipal de Moreno
              </h1>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0" />
              <span>Moreno · Pernambuco</span>
            </div>
            {orgao?.contato && (
              <div className="flex items-center gap-2">
                <Mail className="size-4 shrink-0" />
                <a href={`mailto:${orgao.contato}`} className="hover:text-foreground">
                  {orgao.contato}
                </a>
              </div>
            )}
          </div>
          <p className="text-muted-foreground max-w-[65ch]">
            Todas as denúncias registradas pela população — identificadas ou
            anônimas — são encaminhadas automaticamente para este painel para
            triagem e fiscalização.
          </p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(
            [
              ["em_analise", "Em análise"],
              ["confirmada", "Confirmadas"],
              ["arquivada", "Arquivadas"],
              ["falsa", "Falsas"],
            ] as const
          ).map(([s, label]) => (
            <div key={s} className="bg-card p-4 rounded-xl ring-1 ring-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                {label}
              </p>
              <p className="text-2xl font-semibold tabular-nums">
                {String(filterBy(s).length).padStart(2, "0")}
              </p>
            </div>
          ))}
        </div>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Inbox className="size-4 text-muted-foreground" />
            <h2 className="font-display text-lg">Caixa de entrada</h2>
          </div>

          <Tabs defaultValue="em_analise">
            <TabsList>
              <TabsTrigger value="em_analise">Novas</TabsTrigger>
              <TabsTrigger value="todas">Todas</TabsTrigger>
              <TabsTrigger value="confirmada">Confirmadas</TabsTrigger>
              <TabsTrigger value="arquivada">Arquivadas</TabsTrigger>
            </TabsList>
            {(["em_analise", "todas", "confirmada", "arquivada"] as const).map(
              (tab) => (
                <TabsContent key={tab} value={tab} className="mt-4">
                  {isLoading ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Carregando...
                    </p>
                  ) : filterBy(tab).length === 0 ? (
                    <p className="py-12 text-center text-sm text-muted-foreground">
                      Nenhuma denúncia nesta categoria.
                    </p>
                  ) : (
                    <div className="divide-y divide-border">
                      {filterBy(tab).map((r) => (
                        <ReportListItem key={r.id} {...r} />
                      ))}
                    </div>
                  )}
                </TabsContent>
              ),
            )}
          </Tabs>
        </section>

        <footer className="pt-6 border-t border-border text-xs text-muted-foreground">
          <Link to="/painel-fiscal" className="hover:text-foreground underline">
            Ir para o painel geral do fiscal
          </Link>
        </footer>
      </div>
    </AppShell>
  );
}
