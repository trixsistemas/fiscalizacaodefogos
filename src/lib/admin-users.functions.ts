import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const createSchema = z.object({
  username: z.string().min(3).max(40).regex(/^[a-zA-Z0-9_.-]+$/),
  password: z.string().min(6).max(128),
  nome: z.string().min(1).max(120),
  email: z.string().email().optional(),
  roles: z.array(z.enum(["admin", "fiscal", "cidadao"])).min(1),
});

const passwordSchema = z.object({
  user_id: z.string().uuid(),
  password: z.string().min(6).max(128),
});

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email ?? `${data.username}@trix.local`;

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { nome: data.nome, username: data.username },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Falha ao criar usuário");

    const uid = created.user.id;
    await supabaseAdmin.from("profiles").upsert({ id: uid, nome: data.nome, email });
    const rows = data.roles.map((role) => ({ user_id: uid, role }));
    await supabaseAdmin.from("user_roles").upsert(rows, { onConflict: "user_id,role" });

    return { id: uid, email };
  });

export const adminUpdatePassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => passwordSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (error) throw new Error(error.message);
    const ids = list.users.map((u) => u.id);
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", ids);
    const rolesByUser = new Map<string, string[]>();
    (roles ?? []).forEach((r: any) => {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesByUser.set(r.user_id, arr);
    });
    return list.users.map((u) => ({
      id: u.id,
      email: u.email,
      nome: (u.user_metadata as any)?.nome ?? null,
      criado_em: u.created_at,
      roles: rolesByUser.get(u.id) ?? [],
    }));
  });
