import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapPin, Loader2 } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/nova-denuncia")({
  head: () => ({ meta: [{ title: "Nova denúncia — Fiscaliza Fogos" }] }),
  component: NovaDenuncia,
});

function NovaDenuncia() {
  const navigate = useNavigate();
  const [tipo, setTipo] = useState<OccurrenceType>("fogo_com_estampido");
  const [descricao, setDescricao] = useState("");
  const [bairro, setBairro] = useState("");
  const [endereco, setEndereco] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [locating, setLocating] = useState(false);

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
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sessão expirada");

      const { data: report, error } = await supabase
        .from("reports")
        .insert({
          usuario_id: userData.user.id,
          tipo_ocorrencia: tipo,
          descricao: descricao || null,
          latitude: coords.lat,
          longitude: coords.lng,
          bairro: bairro || null,
          endereco: endereco || null,
        })
        .select("id")
        .single();
      if (error) throw error;

      // upload evidences
      for (const file of files) {
        const ext = file.name.split(".").pop();
        const path = `${userData.user.id}/${report.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("evidence")
          .upload(path, file);
        if (upErr) continue;
        const tipoEv = file.type.startsWith("video")
          ? "video"
          : file.type.startsWith("audio")
            ? "audio"
            : "foto";
        await supabase.from("evidence").insert({
          report_id: report.id,
          tipo: tipoEv,
          arquivo_url: path,
        });
      }
      return report.id;
    },
    onSuccess: (id) => {
      toast.success("Denúncia registrada");
      navigate({ to: "/denuncia/$id", params: { id } });
    },
    onError: (err: Error) => {
      toast.error("Falha", { description: err.message });
    },
  });

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <header className="space-y-2 mb-8">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
            Registrar nova denúncia
          </p>
          <h1 className="text-3xl md:text-4xl font-display leading-tight">
            Sua denúncia ajuda a mapear zonas críticas.
          </h1>
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
                onChange={(e) => setBairro(e.target.value)}
                placeholder="Ex.: Vila Mariana"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endereco">Referência</Label>
              <Input
                id="endereco"
                value={endereco}
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
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
            {files.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {files.length} arquivo(s) selecionado(s)
              </p>
            )}
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
              {submit.isPending ? "Enviando..." : "Registrar denúncia"}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
