import { Link } from "@tanstack/react-router";
import { Flame } from "lucide-react";
import { OCCURRENCE_LABELS, timeAgo, type OccurrenceType, type ReportStatus } from "@/lib/labels";
import { StatusBadge } from "./StatusBadge";

interface Props {
  id: string;
  tipo_ocorrencia: OccurrenceType;
  bairro: string | null;
  criado_em: string;
  status: ReportStatus;
}

export function ReportListItem({ id, tipo_ocorrencia, bairro, criado_em, status }: Props) {
  return (
    <Link
      to="/denuncia/$id"
      params={{ id }}
      className="py-4 flex items-center justify-between gap-3 group hover:bg-muted/40 -mx-3 px-3 rounded-lg transition-colors"
    >
      <div className="flex items-start gap-4 min-w-0">
        <div className="size-10 bg-muted rounded-lg flex items-center justify-center shrink-0">
          <Flame className="size-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">
            {OCCURRENCE_LABELS[tipo_ocorrencia]}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {bairro ?? "Localização aproximada"} • {timeAgo(criado_em)}
          </p>
        </div>
      </div>
      <StatusBadge status={status} />
    </Link>
  );
}
