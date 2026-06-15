import type { Database } from "@/integrations/supabase/types";

export type OccurrenceType = Database["public"]["Enums"]["occurrence_type"];
export type ReportStatus = Database["public"]["Enums"]["report_status"];
export type AppRole = Database["public"]["Enums"]["app_role"];
export type EvidenceType = Database["public"]["Enums"]["evidence_type"];
export type InspectionResult = Database["public"]["Enums"]["inspection_result"];

export const OCCURRENCE_LABELS: Record<OccurrenceType, string> = {
  fogo_com_estampido: "Fogo com estampido",
  fogo_silencioso: "Fogo silencioso",
  rojao: "Rojão",
  bateria_fogos: "Bateria de fogos",
  outro: "Outro",
};

export const STATUS_LABELS: Record<ReportStatus, string> = {
  em_analise: "Em análise",
  confirmada: "Confirmada",
  arquivada: "Arquivada",
  falsa: "Denúncia falsa",
};

export const STATUS_CLASSES: Record<ReportStatus, string> = {
  em_analise: "bg-status-analise text-status-analise-fg",
  confirmada: "bg-status-confirmada text-status-confirmada-fg",
  arquivada: "bg-status-arquivada text-status-arquivada-fg",
  falsa: "bg-status-falsa text-status-falsa-fg",
};

export const RESULT_LABELS: Record<InspectionResult, string> = {
  confirmado: "Confirmado",
  nao_confirmado: "Não confirmado",
  inconclusivo: "Inconclusivo",
};

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora mesmo";
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return `há ${d} d`;
}
