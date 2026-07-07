import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Calendar, User as UserIcon } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/reports/StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  OCCURRENCE_LABELS,
  STATUS_LABELS,
  RESULT_LABELS,
  type ReportStatus,
  type InspectionResult,
} from "@/lib/labels";
import { useAuth, hasRole } from "@/hooks/use-auth";

export const Route = createFileRoute("/denuncia/$id")({
  head: () => ({ meta: [{ title: "Denúncia — Fiscaliza Fogos" }] }),
  component: ReportDetail,
});

function ReportDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const auth = useAuth();

  const isFiscal = hasRole(auth.roles, "fiscal") || hasRole(auth.roles, "admin");

  const { data, isLoading } = useQuery({
    queryKey: ["report", id],
    queryFn: async () => {
      const { data: r, error } = await supabase
        .from("reports")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      const { data: ev } = await supabase
        .from("evidence")
        .select("*")
        .eq("report_id", id);
      const evidencesWithUrls = await Promise.all(
        (ev ?? []).map(async (e) => {
          const { data: signed } = await supabase.storage
            .from("evidence")
            .createSignedUrl(e.arquivo_url, 3600);
          return { ...e, signedUrl: signed?.signedUrl ?? null };
        }),
      );
      const { data: insp } = await supabase
        .from("inspections")
        .select("*")
        .eq("report_id", id)
        .order("data_fiscalizacao", { ascending: false });
      return { report: r, evidences: evidencesWithUrls, inspections: insp ?? [] };
    },
  });

  const [newStatus, setNewStatus] = useState<ReportStatus | "">("");
  const [obs, setObs] = useState("");
  const [resultado, setResultado] = useState<InspectionResult>("confirmado");

  const updateStatus = useMutation({
    mutationFn: async () => {
      if (!newStatus) return;
      const { data, error } = await supabase
        .from("reports")
        .update({ status: newStatus })
        .eq("id", id)
        .select("id, status");
      if (error) throw error;
      if (!data || data.length === 0)
        throw new Error("Sem permissão para atualizar esta denúncia.");
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      setNewStatus("");
      qc.invalidateQueries({ queryKey: ["report", id] });
      qc.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addInspection = useMutation({
    mutationFn: async () => {
      if (!auth.user) throw new Error("Sessão expirada");
      const { data, error } = await supabase
        .from("inspections")
        .insert({
          report_id: id,
          fiscal_id: auth.user.id,
          observacao: obs || null,
          resultado,
        })
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0)
        throw new Error("Sem permissão para registrar fiscalização.");
    },

    onSuccess: () => {
      toast.success("Fiscalização registrada");
      setObs("");
      qc.invalidateQueries({ queryKey: ["report", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </AppShell>
    );
  }

  const { report, evidences, inspections } = data;
  const isOwner = auth.user?.id === report.usuario_id;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <button
          onClick={() => navigate({ to: "/" })}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <ArrowLeft className="size-4" />
          Voltar
        </button>

        <header className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <StatusBadge status={report.status} />
            <span className="text-xs text-muted-foreground">
              ID {report.id.slice(0, 8)}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-display leading-tight">
            {OCCURRENCE_LABELS[report.tipo_ocorrencia]}
          </h1>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4" />
              {report.bairro ?? "Localização aproximada"}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="size-4" />
              {new Date(report.criado_em).toLocaleString("pt-BR")}
            </span>
            {isOwner && (
              <span className="flex items-center gap-1.5 text-brand">
                <UserIcon className="size-4" />
                Sua denúncia
              </span>
            )}
          </div>
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-card p-6 rounded-2xl ring-1 ring-border space-y-3">
            <h3 className="text-sm font-semibold">Descrição</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {report.descricao || "Sem descrição."}
            </p>
            {report.endereco && (
              <p className="text-xs text-muted-foreground">
                <strong>Referência:</strong> {report.endereco}
              </p>
            )}
            <p className="text-xs font-mono text-muted-foreground pt-2">
              {Number(report.latitude).toFixed(5)},{" "}
              {Number(report.longitude).toFixed(5)}
            </p>
          </div>

          <div className="bg-card p-6 rounded-2xl ring-1 ring-border space-y-3">
            <h3 className="text-sm font-semibold">
              Evidências ({evidences.length})
            </h3>
            {evidences.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma evidência anexada.
              </p>
            ) : (
              <ul className="space-y-2">
                {evidences.map((e) => {
                  const { data: pub } = supabase.storage
                    .from("evidence")
                    .getPublicUrl(e.arquivo_url);
                  return (
                    <li key={e.id} className="text-xs">
                      <a
                        href={pub.publicUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand hover:underline uppercase tracking-wider font-semibold"
                      >
                        {e.tipo} → abrir
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {isFiscal && (
          <section className="bg-ink text-brand-foreground p-6 rounded-2xl space-y-6">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-brand-foreground/60">
              Painel do fiscal
            </h3>

            <div className="space-y-3">
              <p className="text-sm font-medium">Atualizar status</p>
              <div className="flex gap-2 items-end">
                <Select
                  value={newStatus}
                  onValueChange={(v) => setNewStatus(v as ReportStatus)}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-brand-foreground">
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUS_LABELS) as ReportStatus[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {STATUS_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="secondary"
                  onClick={() => updateStatus.mutate()}
                  disabled={!newStatus || updateStatus.isPending}
                >
                  Atualizar
                </Button>
              </div>
            </div>

            <div className="space-y-3 border-t border-white/10 pt-6">
              <p className="text-sm font-medium">Registrar fiscalização</p>
              <Select
                value={resultado}
                onValueChange={(v) => setResultado(v as InspectionResult)}
              >
                <SelectTrigger className="bg-white/10 border-white/20 text-brand-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(RESULT_LABELS) as InspectionResult[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {RESULT_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Observações da fiscalização..."
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                className="bg-white/10 border-white/20 text-brand-foreground placeholder:text-brand-foreground/40"
              />
              <Button
                variant="secondary"
                onClick={() => addInspection.mutate()}
                disabled={addInspection.isPending}
              >
                Registrar fiscalização
              </Button>
            </div>
          </section>
        )}

        {inspections.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">
              Histórico de fiscalizações
            </h3>
            <div className="divide-y divide-border bg-card rounded-2xl ring-1 ring-border">
              {inspections.map((i) => (
                <div key={i.id} className="p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-brand">
                      {RESULT_LABELS[i.resultado]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(i.data_fiscalizacao).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  {i.observacao && (
                    <p className="text-sm text-muted-foreground">
                      {i.observacao}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
