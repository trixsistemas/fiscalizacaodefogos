import { createFileRoute } from "@tanstack/react-router";

const MAX_FILES = 5;
const MAX_BYTES = 25 * 1024 * 1024; // 25MB per file
const ALLOWED = /^(image|video|audio)\//;

export const Route = createFileRoute("/api/public/anonymous-evidence")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const form = await request.formData();
          const reportId = String(form.get("report_id") ?? "");
          if (!/^[0-9a-f-]{36}$/i.test(reportId)) {
            return new Response("Invalid report_id", { status: 400 });
          }
          const files = form.getAll("files").filter((f): f is File => f instanceof File);
          if (files.length === 0) return new Response("No files", { status: 400 });
          if (files.length > MAX_FILES)
            return new Response("Too many files", { status: 400 });

          const { supabaseAdmin } = await import(
            "@/integrations/supabase/client.server"
          );

          // Verify report exists, is anonymous, and was created very recently
          const { data: report, error: repErr } = await supabaseAdmin
            .from("reports")
            .select("id, usuario_id, criado_em")
            .eq("id", reportId)
            .maybeSingle();
          if (repErr || !report) return new Response("Not found", { status: 404 });
          if (report.usuario_id !== null)
            return new Response("Forbidden", { status: 403 });
          const ageMs = Date.now() - new Date(report.criado_em).getTime();
          if (ageMs > 10 * 60 * 1000)
            return new Response("Window expired", { status: 403 });

          for (const file of files) {
            if (!ALLOWED.test(file.type))
              return new Response("Invalid file type", { status: 400 });
            if (file.size > MAX_BYTES)
              return new Response("File too large", { status: 400 });

            const ext = (file.name.split(".").pop() ?? "bin")
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "")
              .slice(0, 8);
            const path = `anonymous/${reportId}/${crypto.randomUUID()}.${ext}`;
            const buf = new Uint8Array(await file.arrayBuffer());
            const { error: upErr } = await supabaseAdmin.storage
              .from("evidence")
              .upload(path, buf, { contentType: file.type, upsert: false });
            if (upErr) continue;
            const tipo = file.type.startsWith("video")
              ? "video"
              : file.type.startsWith("audio")
                ? "audio"
                : "foto";
            await supabaseAdmin.from("evidence").insert({
              report_id: reportId,
              tipo,
              arquivo_url: path,
            });
          }

          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          return new Response(
            (e as Error).message ?? "Internal error",
            { status: 500 },
          );
        }
      },
    },
  },
});
