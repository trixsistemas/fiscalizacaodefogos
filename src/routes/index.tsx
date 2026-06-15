import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { IncidentMap } from "@/components/reports/IncidentMap";
import { ReportListItem } from "@/components/reports/ReportListItem";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { ReportStatus } from "@/lib/labels";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mapa de denúncias — Fiscaliza Fogos" },
      {
        name: "description",
        content:
          "Acompanhe em tempo real as denúncias de fogos com estampido em sua região.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("id, tipo_ocorrencia, status, bairro, criado_em, latitude, longitude")
        .order("criado_em", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const reports = data ?? [];
  const stats = reports.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<ReportStatus, number>,
  );

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-8 space-y-8">
            <header className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-display leading-[1.05] text-balance max-w-[20ch]">
                Monitoramento de poluição sonora urbana
              </h1>
              <p className="text-muted-foreground text-pretty max-w-[56ch]">
                Acompanhe e fiscalize em tempo real a incidência de fogos de
                artifício com estampido em sua região.
              </p>
            </header>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Em análise" value={stats.em_analise ?? 0} />
              <StatCard
                label="Confirmadas"
                value={stats.confirmada ?? 0}
                accent
              />
              <StatCard label="Arquivadas" value={stats.arquivada ?? 0} />
              <StatCard
                label="Falsas"
                value={stats.falsa ?? 0}
                muted
              />
            </div>

            <IncidentMap
              points={reports.map((r) => ({
                id: r.id,
                latitude: Number(r.latitude),
                longitude: Number(r.longitude),
                status: r.status,
              }))}
            />

            <section className="space-y-2">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h2 className="text-lg font-semibold">Denúncias recentes</h2>
                <Link
                  to="/minhas-denuncias"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Ver todas →
                </Link>
              </div>
              {isLoading ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Carregando...
                </div>
              ) : reports.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Ainda não há denúncias registradas.
                  </p>
                  <Link to="/nova-denuncia">
                    <Button size="sm" className="gap-1.5">
                      <Plus className="size-4" />
                      Registrar primeira denúncia
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {reports.slice(0, 6).map((r) => (
                    <ReportListItem key={r.id} {...r} />
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="col-span-12 lg:col-span-4 space-y-8">
            <div className="bg-card p-6 rounded-2xl ring-1 ring-border space-y-4">
              <h3 className="font-semibold">Diretrizes de denúncia</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <span className="size-1.5 rounded-full bg-brand mt-2 shrink-0" />
                  <span>
                    Denuncie apenas fogos com estampido (proibidos por lei
                    municipal em diversas cidades).
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="size-1.5 rounded-full bg-brand mt-2 shrink-0" />
                  <span>
                    Sua denúncia ajuda a mapear zonas críticas para
                    fiscalização.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="size-1.5 rounded-full bg-brand mt-2 shrink-0" />
                  <span>
                    Anexe foto, vídeo ou áudio quando possível — fortalece a
                    fiscalização.
                  </span>
                </li>
              </ul>
              <Link to="/nova-denuncia" className="block pt-2">
                <Button size="lg" className="w-full gap-2">
                  <Plus className="size-4" />
                  Registrar denúncia
                </Button>
              </Link>
            </div>

            <div className="bg-ink text-brand-foreground p-6 rounded-2xl space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-brand-foreground/60">
                LGPD &amp; Privacidade
              </h3>
              <p className="text-sm text-brand-foreground/80 text-pretty">
                Seus dados pessoais nunca são exibidos no mapa público. A
                visualização é sempre anônima.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  accent,
  muted,
}: {
  label: string;
  value: number;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="bg-card p-4 rounded-xl ring-1 ring-border">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
        {label}
      </p>
      <p
        className={
          "text-2xl font-semibold tabular-nums " +
          (accent ? "text-brand" : muted ? "text-muted-foreground" : "")
        }
      >
        {String(value).padStart(2, "0")}
      </p>
    </div>
  );
}
