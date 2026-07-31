"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { LayoutDashboard, FileText, CreditCard, MessageSquare, Stamp, User, LogOut, Bell, Menu, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { BrandLogo } from "@/components/brand-logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV_BASE = [
  { href: "/espace", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { href: "/espace/dossier", label: "Mon dossier", icon: FileText },
  { href: "/espace/paiement", label: "Paiement", icon: CreditCard },
  { href: "/espace/messages", label: "Messages", icon: MessageSquare, showBadge: "messages" as const },
  { href: "/espace/attestation", label: "Attestation", icon: Stamp },
  { href: "/espace/profil", label: "Profil", icon: User },
];

function useUnreadCounts() {
  const [messages, setMessages] = React.useState(0);
  const [notifs, setNotifs] = React.useState(0);
  const [items, setItems] = React.useState<{ id: string; titre: string; message: string; lien?: string | null }[]>([]);

  const refresh = React.useCallback(async () => {
    try {
      const [nRes, dRes] = await Promise.all([
        fetch("/api/notifications?unread=1"),
        fetch("/api/dossiers"),
      ]);
      if (nRes.ok) {
        const n = await nRes.json();
        setNotifs(n.unreadCount ?? 0);
        setItems(n.notifications ?? []);
      }
      if (dRes.ok) {
        const dossiers = await dRes.json();
        const list = Array.isArray(dossiers) ? dossiers : dossiers.data ?? [];
        let sum = 0;
        for (const d of list) {
          sum += d.conversation?.nonLusCandidat ?? 0;
        }
        setMessages(sum);
      }
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    refresh();
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
  }, [refresh]);

  return { messages, notifs, items, refresh };
}

function NavList({
  onNavigate,
  messageBadge,
}: {
  onNavigate?: () => void;
  messageBadge: number;
}) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1 px-3" aria-label="Navigation candidat">
      {NAV_BASE.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = item.icon;
        const badge = item.showBadge === "messages" && messageBadge > 0 ? messageBadge : null;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "bg-primary/10 text-primary" : "text-foreground/75 hover:bg-muted hover:text-foreground"
            )}
          >
            {active && <span className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-primary" aria-hidden />}
            <Icon className="h-4 w-4" strokeWidth={1.5} />
            <span className="flex-1">{item.label}</span>
            {badge ? (
              <Badge className="h-5 min-w-5 justify-center bg-ambre/15 px-1.5 text-[10px] font-mono text-ambre">{badge}</Badge>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex flex-col gap-1 px-5 py-5" aria-label="Accueil GET Admission">
      <BrandLogo height={32} />
      <span className="font-mono text-[10px] uppercase tracking-eyebrow text-muted-foreground">Espace candidat</span>
    </Link>
  );
}

function UserCard() {
  const { data: session, status } = useSession();
  const u = session?.user;
  if (status === "loading") {
    return (
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-md p-2">
          <Loader2 className="h-9 w-9 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }
  return (
    <div className="border-t border-border p-3 space-y-1">
      <div className="flex items-center gap-3 rounded-md p-2">
        <div className="relative h-9 w-9 flex-none overflow-hidden rounded-full border border-border bg-primary/10">
          {u?.image ? (
            <Image src={u.image} alt={`${u.prenom} ${u.nom}`} fill className="object-cover" sizes="36px" />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-mono text-xs font-semibold text-primary">
              {u ? `${u.prenom?.[0] ?? ""}${u.nom?.[0] ?? ""}` : ""}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {u?.prenom} {u?.nom}
          </p>
          <p className="truncate text-xs text-muted-foreground">Candidat</p>
        </div>
      </div>
      <Button
        variant="ghost"
        className="h-9 w-full justify-start gap-2 px-3 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        onClick={() => signOut({ callbackUrl: "/connexion" })}
      >
        <LogOut className="h-4 w-4" strokeWidth={1.5} />
        Déconnexion
      </Button>
    </div>
  );
}

export function EspaceShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const pathname = usePathname();
  const { messages, notifs, items, refresh } = useUnreadCounts();
  const current = NAV_BASE.find((n) => (n.exact ? pathname === n.href : pathname.startsWith(n.href)));

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <aside className="hidden lg:flex w-64 flex-none flex-col border-r border-border bg-card">
        <div className="flex-none">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto scroll-fine py-2">
          <NavList messageBadge={messages} />
        </div>
        <div className="flex-none">
          <UserCard />
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <header className="flex flex-none h-16 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur-md sm:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden text-foreground" aria-label="Ouvrir le menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-card border-r-border p-0 flex flex-col">
              <SheetTitle className="sr-only">Menu candidat</SheetTitle>
              <Brand />
              <div className="flex-1 overflow-y-auto py-2">
                <NavList onNavigate={() => setMobileOpen(false)} messageBadge={messages} />
              </div>
              <UserCard />
            </SheetContent>
          </Sheet>

          <nav className="flex items-center gap-1.5 text-sm" aria-label="Fil d'Ariane">
            <Link href="/espace" className="text-muted-foreground hover:text-foreground">
              Espace
            </Link>
            <span className="text-muted-foreground/50">/</span>
            <span className="font-medium text-foreground">{current?.label ?? "Tableau de bord"}</span>
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground" aria-label="Notifications">
                  <Bell className="h-4 w-4" strokeWidth={1.5} />
                  {notifs > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                {items.length === 0 ? (
                  <DropdownMenuItem disabled>Aucune notification</DropdownMenuItem>
                ) : (
                  items.slice(0, 8).map((n) => (
                    <DropdownMenuItem
                      key={n.id}
                      onClick={async () => {
                        await fetch("/api/notifications", {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ ids: [n.id] }),
                        });
                        refresh();
                        if (n.lien) window.location.href = n.lien;
                      }}
                      className="flex flex-col items-start gap-0.5 py-2"
                    >
                      <span className="text-sm font-medium">{n.titre}</span>
                      <span className="text-xs text-muted-foreground line-clamp-2">{n.message}</span>
                    </DropdownMenuItem>
                  ))
                )}
                {notifs > 0 && (
                  <DropdownMenuItem
                    onClick={async () => {
                      await fetch("/api/notifications", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ all: true }),
                      });
                      refresh();
                    }}
                  >
                    Tout marquer comme lu
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto scroll-fine">
          <div className="w-full p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
