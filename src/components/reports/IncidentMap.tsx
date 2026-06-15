import { useMemo } from "react";

interface Point {
  id: string;
  latitude: number;
  longitude: number;
  status: string;
}

/**
 * Lightweight client-side scatter visualization — projects lat/lng to viewport.
 * Used as an in-page heatmap until a tile-based map is wired in.
 */
export function IncidentMap({ points }: { points: Point[] }) {
  const { projected, bounds } = useMemo(() => {
    if (points.length === 0) {
      return { projected: [], bounds: null as null | { minLat: number; maxLat: number; minLng: number; maxLng: number } };
    }
    const lats = points.map((p) => p.latitude);
    const lngs = points.map((p) => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const padLat = (maxLat - minLat) * 0.15 || 0.01;
    const padLng = (maxLng - minLng) * 0.15 || 0.01;
    const b = {
      minLat: minLat - padLat,
      maxLat: maxLat + padLat,
      minLng: minLng - padLng,
      maxLng: maxLng + padLng,
    };
    return {
      bounds: b,
      projected: points.map((p) => ({
        ...p,
        x: ((p.longitude - b.minLng) / (b.maxLng - b.minLng)) * 100,
        y: 100 - ((p.latitude - b.minLat) / (b.maxLat - b.minLat)) * 100,
      })),
    };
  }, [points]);

  return (
    <div className="relative rounded-2xl overflow-hidden ring-1 ring-border bg-gradient-to-br from-muted via-secondary to-muted h-[400px]">
      {/* Decorative grid */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.15]" aria-hidden>
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" className="text-foreground" />
      </svg>

      {/* Heat blobs */}
      {projected.map((p) => (
        <div
          key={p.id}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
        >
          <div className="absolute inset-0 -m-6 rounded-full bg-brand/20 blur-md" />
          <div className="relative size-3 rounded-full bg-brand ring-4 ring-brand/30 animate-pulse" />
        </div>
      ))}

      {projected.length === 0 && (
        <div className="absolute inset-0 grid place-items-center">
          <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
            Sem ocorrências para exibir
          </span>
        </div>
      )}

      {bounds && (
        <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm p-3 rounded-lg ring-1 ring-border flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-brand animate-pulse" />
            <span className="text-xs font-medium uppercase">
              {projected.length} {projected.length === 1 ? "ocorrência" : "ocorrências"}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {bounds.minLat.toFixed(2)}, {bounds.minLng.toFixed(2)} →{" "}
            {bounds.maxLat.toFixed(2)}, {bounds.maxLng.toFixed(2)}
          </p>
        </div>
      )}
    </div>
  );
}
