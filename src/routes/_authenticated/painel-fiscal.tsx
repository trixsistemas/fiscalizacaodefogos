import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { ReportListItem } from "@/components/reports/ReportListItem";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import type { ReportStatus } from "@/lib/labels";

export const Route = createFileRoute("/_authenticated/painel-fiscal")({
  head: () => ({ meta: [{ title: "Painel fiscal — Fiscaliza Fogos" }] }),
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
  component: PainelFiscal,
});

function PainelFiscal() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "fiscal-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("id, tipo_ocorrencia, status, bairro, criado_em")
        .order("criado_em", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const reports = data ?? [];
  const filterBy = (s: ReportStatus | "todas") =>
    s === "todas" ? reports : reports.filter((r) => r.status === s);

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <header className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
            Acesso restrito
          </p>
          <h1 className="text-3xl md:text-4xl font-display leading-tight">
            Painel do fiscal
          </h1>
          <p className="text-muted-foreground max-w-[60ch]">
            Triagem de todas as denúncias da plataforma. Atualize status e
            registre fiscalizações ao abrir cada denúncia.
          </p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(["em_analise", "confirmada", "arquivada", "falsa"] as const).map(
            (s) => (
              <div
                key={s}
                className="bg-card p-4 rounded-xl ring-1 ring-border"
              >
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  {s.replace("_", " ")}
                </p>
                <p className="text-2xl font-semibold tabular-nums">
                  {String(filterBy(s).length).padStart(2, "0")}
                </p>
              </div>
            ),
          )}
        </div>

        <Tabs defaultValue="em_analise">
          <TabsList>
            <TabsTrigger value="em_analise">Em análise</TabsTrigger>
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
                    Nada por aqui.
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
      </div>
    </AppShell>
  );
}
