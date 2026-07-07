import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, UserPlus, KeyRound, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  adminCreateUser,
  adminDeleteUser,
  adminListUsers,
  adminUpdatePassword,
} from "@/lib/admin-users.functions";
import { useAuth } from "@/hooks/use-auth";

type Role = "admin" | "fiscal" | "cidadao";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  head: () => ({
    meta: [{ title: "Administração de usuários — Fiscaliza Fogos" }],
  }),
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    if (!roles?.some((r) => r.role === "admin")) throw redirect({ to: "/" });
  },
  component: AdminUsuarios,
});

function AdminUsuarios() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const list = useServerFn(adminListUsers);
  const create = useServerFn(adminCreateUser);
  const updatePassword = useServerFn(adminUpdatePassword);
  const removeUser = useServerFn(adminDeleteUser);

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => list({}),
  });

  const [openCreate, setOpenCreate] = useState(false);
  const [username, setUsername] = useState("");
  const [nome, setNome] = useState("");
  const [password, setPassword] = useState("");
  const [roles, setRoles] = useState<Role[]>(["admin", "fiscal"]);

  const toggleRole = (r: Role) =>
    setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));

  const createMut = useMutation({
    mutationFn: () =>
      create({ data: { username, nome, password, roles } }),
    onSuccess: () => {
      toast.success("Usuário criado");
      setOpenCreate(false);
      setUsername("");
      setNome("");
      setPassword("");
      setRoles(["admin", "fiscal"]);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const [pwTarget, setPwTarget] = useState<{ id: string; email: string } | null>(null);
  const [newPw, setNewPw] = useState("");
  const pwMut = useMutation({
    mutationFn: () =>
      updatePassword({ data: { user_id: pwTarget!.id, password: newPw } }),
    onSuccess: () => {
      toast.success("Senha atualizada");
      setPwTarget(null);
      setNewPw("");
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; email: string; nome: string | null } | null>(null);
  const deleteMut = useMutation({
    mutationFn: () => removeUser({ data: { user_id: deleteTarget!.id } }),
    onSuccess: () => {
      toast.success("Usuário excluído");
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-xl bg-brand/10 ring-1 ring-brand/30 flex items-center justify-center">
              <ShieldCheck className="size-6 text-brand" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                Administração
              </p>
              <h1 className="text-2xl md:text-3xl font-display leading-tight">
                Usuários e permissões
              </h1>
            </div>
          </div>

          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="size-4" /> Novo usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar novo usuário</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createMut.mutate();
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="u-name">Nome completo</Label>
                  <Input id="u-name" value={nome} onChange={(e) => setNome(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="u-user">Usuário</Label>
                  <Input
                    id="u-user"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ex.: joao.silva"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Será gerado o e-mail <code>{username || "usuario"}@trix.local</code>.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="u-pw">Senha</Label>
                  <Input
                    id="u-pw"
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Permissões</Label>
                  <div className="space-y-2">
                    {(["admin", "fiscal", "cidadao"] as Role[]).map((r) => (
                      <label key={r} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={roles.includes(r)}
                          onCheckedChange={() => toggleRole(r)}
                        />
                        <span className="capitalize">{r}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={createMut.isPending}>
                  {createMut.isPending ? "Criando..." : "Criar usuário"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </header>

        <section className="bg-card ring-1 ring-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border text-xs uppercase tracking-widest text-muted-foreground font-medium">
            {users?.length ?? 0} usuário(s)
          </div>
          {isLoading ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <ul className="divide-y divide-border">
              {(users ?? []).map((u) => (
                <li key={u.id} className="px-4 py-3 flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{u.nome || u.email}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {u.roles.length === 0 ? (
                      <span className="text-xs text-muted-foreground">sem papel</span>
                    ) : (
                      u.roles.map((r) => (
                        <span
                          key={r}
                          className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-muted text-foreground/70"
                        >
                          {r}
                        </span>
                      ))
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => setPwTarget({ id: u.id, email: u.email ?? "" })}
                  >
                    <KeyRound className="size-3.5" /> Senha
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Dialog open={!!pwTarget} onOpenChange={(o) => !o && setPwTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir senha</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Usuário: <strong>{pwTarget?.email}</strong>
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              pwMut.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="new-pw">Nova senha</Label>
              <Input
                id="new-pw"
                type="text"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={pwMut.isPending}>
              {pwMut.isPending ? "Salvando..." : "Salvar nova senha"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
