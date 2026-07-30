"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Plane, LayoutDashboard, FolderOpen, Building2, Wallet, Users, Stamp, Settings, LogOut, Menu, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { GlobalSearch } from "@/components/admin/global-search";
import { NotificationsBell } from "@/components/admin/notifications-bell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const SECTIONS = [
  { title: "Pilotage", items: [{ href: "/admin", label: "Tableau de bord", icon: LayoutDashboard, exact: true }] },
  {
    title: "Dossiers",
    items: [
      { href: "/admin/dossiers", label: "Tous les dossiers", icon: FolderOpen },
      { href: "/admin/catalogue", label: "Catalogue", icon: Building2 },
    ],
  },
  {
    title: "Gestion",
    items: [
      { href: "/admin/finance", label: "Finance", icon: Wallet },
      { href: "/admin/utilisateurs", label: "Utilisateurs", icon: Users },
      { href: "/admin/attestations", label: "Attestations", icon: Stamp },
    ],
  },
  { title: "Système", items: [{ href: "/admin/parametres", label: "Paramètres", icon: Settings }] },
];

function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-5 px-3 py-4" aria-label="Navigation administration">
      {SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="px-3 font-mono text-[10px] uppercase tracking-eyebrow text-ardoise/80">{section.title}</p>
          <ul className="mt-1.5 space-y-0.5">
            {section.items.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
                      active ? "bg-lapis/8 text-lapis" : "text-encre/75 hover:bg-porcelaine hover:text-lapis"
                    )}
                  >
                    {active && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-or" aria-hidden />}
                    <Icon className="h-4 w-4 flex-none" strokeWidth={1.5} />
                    <span className="flex-1 truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function AdminBrand() {
  return (
    <Link href="/admin" className="flex items-center gap-2.5 px-4 py-4" aria-label="Tableau de bord admin">
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-lapis text-blanc">
        <Plane className="h-4 w-4 -rotate-12" strokeWidth={1.75} />
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-display text-sm font-bold tracking-tight text-encre">GET Admission</span>
        <span className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Back-office</span>
      </span>
    </Link>
  );
}

function AdminUser() {
  const { data: session, status } = useSession();
  const u = session?.user;
  if (status === "loading") {
    return (
      <div className="border-t border-ligne p-3">
        <div className="flex items-center gap-2.5 rounded-md p-2">
          <Loader2 className="h-8 w-8 animate-spin text-ardoise" />
        </div>
      </div>
    );
  }
  const initiales = u ? `${u.prenom[0] ?? ""}${u.nom[0] ?? ""}` : "?";
  return (
    <div className="border-t border-ligne p-3">
      <div className="flex items-center gap-2.5 rounded-md p-2">
        <Avatar className="h-8 w-8 border border-ligne">
          <AvatarFallback className="bg-lapis/10 font-mono text-xs font-semibold text-lapis">{initiales}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-encre">{u?.prenom} {u?.nom}</p>
          <p className="truncate text-xs capitalize text-ardoise">{(u?.role ?? "").replace(/_/g, " ").toLowerCase()}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-ardoise hover:text-carmin" aria-label="Se déconnecter" onClick={() => signOut({ callbackUrl: "/" })}>
          <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
        </Button>
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => { setOpen(false); }, [pathname]);

  const current = SECTIONS.flatMap((s) => s.items).find((i) => (i.exact ? pathname === i.href : pathname.startsWith(i.href)));

  return (
    // App-shell plein écran : sidebar + header fixes, seul le contenu défile
    <div className="flex h-screen overflow-hidden bg-porcelaine">
      {/* Sidebar desktop — pleine hauteur */}
      <aside className="hidden lg:flex w-60 flex-none flex-col border-r border-ligne bg-blanc">
        <div className="flex-none"><AdminBrand /></div>
        <div className="flex-1 overflow-y-auto scroll-fine"><AdminNav /></div>
        <div className="flex-none"><AdminUser /></div>
      </aside>

      {/* Conteneur droit : header + breadcrumb + main scrollable */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Header fixe — pleine largeur */}
        <header className="flex flex-none h-14 items-center gap-3 border-b border-ligne bg-blanc/90 px-4 backdrop-blur sm:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Ouvrir le menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-blanc p-0 flex flex-col">
              <SheetTitle className="sr-only">Menu administration</SheetTitle>
              <AdminBrand />
              <div className="flex-1 overflow-y-auto"><AdminNav onNavigate={() => setOpen(false)} /></div>
              <AdminUser />
            </SheetContent>
          </Sheet>

          <GlobalSearch />

          <div className="ml-auto flex items-center gap-1.5">
            <NotificationsBell />
          </div>
        </header>

        {/* Barre breadcrumb — pleine largeur */}
        <div className="flex flex-none items-center h-10 border-b border-ligne bg-blanc px-4 sm:px-6">
          <nav className="flex items-center gap-1.5 text-sm" aria-label="Fil d'Ariane">
            <Link href="/admin" className="text-ardoise hover:text-lapis">Admin</Link>
            <span className="text-ardoise/50">/</span>
            <span className="font-medium text-encre">{current?.label ?? "Tableau de bord"}</span>
          </nav>
        </div>

        {/* Main scrollable — contenu pleine largeur */}
        <main className="flex-1 overflow-y-auto scroll-fine">
          <div className="w-full p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
