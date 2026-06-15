import { cn } from "@/lib/utils";
import { STATUS_CLASSES, STATUS_LABELS, type ReportStatus } from "@/lib/labels";

export function StatusBadge({ status }: { status: ReportStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ring-1 ring-current/10",
        STATUS_CLASSES[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
