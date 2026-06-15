import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapPin, Loader2, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { OCCURRENCE_LABELS, type OccurrenceType } from "@/lib/labels";

export const Route = createFileRoute("/denuncia-anonima")({
  head: () => ({
    meta: [
      { title: "Denúncia anônima — Fiscaliza Fogos" },
      {
        name: "description",
        content:
          "Registre uma denúncia de fogos com estampido sem precisar criar conta. Seus dados pessoais não são coletados.",
      },
    ],
  }),
  component: DenunciaAnonima,
});

const schema = z.object({
  tipo: z.string().min(1),
  descricao: z.string().trim().max(2000).optional(),
  bairro: z.string().trim().max(120).optional(),
  endereco: z.string().trim().max(250).optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

function DenunciaAnonima() {
  const navigate = useNavigate();
  const [tipo, setTipo] = useState<OccurrenceType>("fogo_com_estampido");
  const [descricao, setDescricao] = useState("");
  const [bairro, setBairro] = useState("");
  const [endereco, setEndereco] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocalização não suportada");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        toast.success("Localização capturada");
      },
      () => {
        setLocating(false);
        toast.error("Não foi possível obter sua localização");
      },
    );
  };

  const submit = useMutation({
    mutationFn: async () => {
      if (!coords) throw new Error("Defina a localização da ocorrência");
      const parsed = schema.parse({
        tipo,
        descricao,
        bairro,
        endereco,
        lat: coords.lat,
        lng: coords.lng,
      });

      const { data, error } = await supabase.rpc("create_anonymous_report", {
        _tipo: parsed.tipo as OccurrenceType,
        _latitude: parsed.lat,
        _longitude: parsed.lng,
        _descricao: parsed.descricao || undefined,
        _bairro: parsed.bairro || undefined,
        _endereco: parsed.endereco || undefined,
      });
      if (error) throw error;
      const reportId = data as string;

      if (files.length > 0) {
        const fd = new FormData();
        fd.append("report_id", reportId);
        for (const f of files.slice(0, 5)) fd.append("files", f);
        const res = await fetch("/api/public/anonymous-evidence", {
          method: "POST",
          body: fd,
        });
        if (!res.ok) {
          toast.warning("Denúncia criada, mas falha ao enviar evidências");
        }
      }
      return reportId;
    },
    onSuccess: () => {
      toast.success("Denúncia anônima registrada");
      navigate({ to: "/" });
    },
    onError: (err: Error) => {
      toast.error("Falha", { description: err.message });
    },
  });

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <header className="space-y-3 mb-8">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
            Denúncia anônima
          </p>
          <h1 className="text-3xl md:text-4xl font-display leading-tight">
            Registre sem precisar criar conta.
          </h1>
          <div className="flex items-start gap-2 p-4 rounded-xl bg-card ring-1 ring-border text-sm text-muted-foreground">
            <ShieldCheck className="size-4 text-brand shrink-0 mt-0.5" />
            <p>
              Não coletamos seu nome, e-mail nem IP. Fotos, vídeos e áudios
              enviados ficam visíveis apenas para fiscais responsáveis.
            </p>
          </div>
        </header>

        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            submit.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label>Tipo de ocorrência</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as OccurrenceType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(OCCURRENCE_LABELS) as OccurrenceType[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {OCCURRENCE_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Localização</Label>
            <div className="flex items-center gap-2 p-4 rounded-xl bg-card ring-1 ring-border">
              <MapPin className="size-4 text-muted-foreground shrink-0" />
              <div className="flex-1 text-sm">
                {coords ? (
                  <span className="font-mono">
                    {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    Nenhuma localização definida
                  </span>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={useMyLocation}
                disabled={locating}
              >
                {locating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Usar minha localização"
                )}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="bairro">Bairro</Label>
              <Input
                id="bairro"
                value={bairro}
                maxLength={120}
                onChange={(e) => setBairro(e.target.value)}
                placeholder="Ex.: Vila Mariana"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endereco">Referência</Label>
              <Input
                id="endereco"
                value={endereco}
                maxLength={250}
                onChange={(e) => setEndereco(e.target.value)}
                placeholder="Próximo a..."
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="descricao">Descrição (opcional)</Label>
            <Textarea
              id="descricao"
              rows={4}
              value={descricao}
              maxLength={2000}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Conte o que aconteceu — horário, frequência, etc."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="evidence">Evidências (foto, vídeo ou áudio)</Label>
            <Input
              id="evidence"
              type="file"
              multiple
              accept="image/*,video/*,audio/*"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 5))}
            />
            <p className="text-xs text-muted-foreground">
              {files.length > 0
                ? `${files.length} arquivo(s) selecionado(s) — máx. 5, 25MB cada`
                : "Opcional. Até 5 arquivos, 25MB cada."}
            </p>
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate({ to: "/" })}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submit.isPending} className="flex-1">
              {submit.isPending ? "Enviando..." : "Registrar anonimamente"}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
