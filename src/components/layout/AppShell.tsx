import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { Plus, LogOut, Menu } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useAuth, hasRole } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  requireRole?: "fiscal" | "admin";
}

const NAV: NavItem[] = [
  { to: "/", label: "Mapa" },
  { to: "/minhas-denuncias", label: "Minhas denúncias" },
  { to: "/painel-fiscal", label: "Painel fiscal", requireRole: "fiscal" },
  { to: "/guarda-moreno", label: "Guarda Municipal", requireRole: "fiscal" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  const visibleNav = NAV.filter((n) => {
    if (!n.requireRole) return true;
    return hasRole(auth.roles, n.requireRole) || hasRole(auth.roles, "admin");
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Emergency Banner */}
      <div className="sticky top-0 z-50 bg-ink text-brand-foreground py-2 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center">
          <span className="text-[10px] sm:text-xs font-medium tracking-wider uppercase">
            Aviso
          </span>
          <span className="text-[10px] sm:text-xs text-white/60">
            Canal cívico — em emergências ligue
          </span>
          <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 bg-white/10 rounded">
            190 / 193
          </span>
        </div>
      </div>

      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-[36px] z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <div className="size-6 bg-brand rounded-sm flex items-center justify-center">
                <div className="size-2 bg-brand-foreground rounded-full" />
              </div>
              <span className="font-semibold tracking-tight text-lg">
                Fiscaliza Fogos
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              {visibleNav.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "text-sm font-medium transition-colors",
                    pathname === n.to
                      ? "text-brand"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {auth.user ? (
              <>
                <Link to="/nova-denuncia" className="hidden sm:inline-flex">
                  <Button size="sm" className="gap-1.5">
                    <Plus className="size-4" />
                    Nova denúncia
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSignOut}
                  title="Sair"
                >
                  <LogOut className="size-4" />
                </Button>
              </>
            ) : (
              <Link to="/auth">
                <Button size="sm" variant="outline">
                  Entrar
                </Button>
              </Link>
            )}
            <button
              className="md:hidden p-2"
              onClick={() => setOpen((o) => !o)}
              aria-label="Menu"
            >
              <Menu className="size-5" />
            </button>
          </div>
        </div>
        {open && (
          <nav className="md:hidden border-t border-border px-4 py-3 flex flex-col gap-2 bg-background">
            {visibleNav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "text-sm font-medium py-2",
                  pathname === n.to ? "text-brand" : "text-muted-foreground",
                )}
              >
                {n.label}
              </Link>
            ))}
            {auth.user && (
              <Link to="/nova-denuncia" onClick={() => setOpen(false)}>
                <Button size="sm" className="gap-1.5 w-full">
                  <Plus className="size-4" />
                  Nova denúncia
                </Button>
              </Link>
            )}
          </nav>
        )}
      </header>

      <main>{children}</main>

      <footer className="border-t border-border mt-20 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between gap-8">
          <div className="space-y-3 max-w-sm">
            <div className="flex items-center gap-2">
              <div className="size-5 bg-muted-foreground/40 rounded-sm" />
              <span className="font-semibold text-muted-foreground tracking-tight">
                Fiscaliza Fogos
              </span>
            </div>
            <p className="text-sm text-muted-foreground text-pretty">
              Iniciativa de transparência pública para o cumprimento das leis
              de silêncio urbano.
            </p>
          </div>
          <div className="flex gap-12 text-sm">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase text-muted-foreground/70">
                Plataforma
              </span>
              <Link to="/" className="text-muted-foreground hover:text-foreground">
                Mapa
              </Link>
              <Link
                to="/minhas-denuncias"
                className="text-muted-foreground hover:text-foreground"
              >
                Minhas denúncias
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase text-muted-foreground/70">
                Jurídico
              </span>
              <span className="text-muted-foreground">Termos de uso</span>
              <span className="text-muted-foreground">Privacidade</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
