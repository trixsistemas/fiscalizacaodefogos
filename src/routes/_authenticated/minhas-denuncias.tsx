import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ReportListItem } from "@/components/reports/ReportListItem";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import type { ReportStatus } from "@/lib/labels";

export const Route = createFileRoute("/_authenticated/minhas-denuncias")({
  head: () => ({ meta: [{ title: "Minhas denúncias — Fiscaliza Fogos" }] }),
  component: MinhasDenuncias,
});

function MinhasDenuncias() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "mine"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return [];
      const { data, error } = await supabase
        .from("reports")
        .select("id, tipo_ocorrencia, status, bairro, criado_em")
        .eq("usuario_id", userData.user.id)
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const reports = data ?? [];

  const filterBy = (s: ReportStatus | "todas") =>
    s === "todas" ? reports : reports.filter((r) => r.status === s);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <header className="flex items-end justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              Suas contribuições
            </p>
            <h1 className="text-3xl md:text-4xl font-display leading-tight">
              Minhas denúncias
            </h1>
          </div>
          <Link to="/nova-denuncia">
            <Button className="gap-1.5">
              <Plus className="size-4" />
              Nova denúncia
            </Button>
          </Link>
        </header>

        <Tabs defaultValue="todas">
          <TabsList>
            <TabsTrigger value="todas">Todas</TabsTrigger>
            <TabsTrigger value="em_analise">Em análise</TabsTrigger>
            <TabsTrigger value="confirmada">Confirmadas</TabsTrigger>
            <TabsTrigger value="arquivada">Arquivadas</TabsTrigger>
          </TabsList>
          {(["todas", "em_analise", "confirmada", "arquivada"] as const).map((tab) => (
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
          ))}
        </Tabs>
      </div>
    </AppShell>
  );
}
