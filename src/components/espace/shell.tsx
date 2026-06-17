"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Plane, LayoutDashboard, FileText, CreditCard, MessageSquare, Stamp, User, LogOut, Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RoleSelector } from "@/components/site/role-selector";
import { useAuth } from "@/lib/auth-context";

const NAV = [
  { href: "/espace", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { href: "/espace/dossier", label: "Mon dossier", icon: FileText },
  { href: "/espace/paiement", label: "Paiement", icon: CreditCard },
  { href: "/espace/messages", label: "Messages", icon: MessageSquare, badge: 2 },
  { href: "/espace/attestation", label: "Attestation", icon: Stamp },
  { href: "/espace/profil", label: "Profil", icon: User },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1 px-3" aria-label="Navigation candidat">
      {NAV.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "bg-lapis/8 text-lapis" : "text-encre/75 hover:bg-porcelaine hover:text-lapis"
            )}
          >
            {active && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-or" aria-hidden />}
            <Icon className="h-4 w-4" strokeWidth={1.5} />
            <span className="flex-1">{item.label}</span>
            {item.badge ? (
              <Badge className="h-5 min-w-5 justify-center bg-ambre/15 px-1.5 text-[10px] font-mono text-ambre">{item.badge}</Badge>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-5 py-5" aria-label="Accueil GET Admission">
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-lapis text-blanc">
        <Plane className="h-4 w-4 -rotate-12" strokeWidth={1.75} />
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-display text-sm font-bold tracking-tight text-encre">GET Admission</span>
        <span className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Espace candidat</span>
      </span>
    </Link>
  );
}

function UserCard() {
  const { user, signOut } = useAuth();
  const u = user ?? { prenom: "Fatou", nom: "Diallo", initiales: "FD", email: "fatou.diallo@demo.getadm" };
  return (
    <div className="border-t border-ligne p-3">
      <div className="flex items-center gap-3 rounded-md p-2">
        <div className="relative h-9 w-9 flex-none overflow-hidden rounded-full border border-ligne">
          <Image src="/images/candidate-portrait.png" alt={`${u.prenom} ${u.nom}`} fill className="object-cover" sizes="36px" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-encre">{u.prenom} {u.nom}</p>
          <p className="truncate text-xs text-ardoise">Candidat</p>
        </div>
        <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-ardoise hover:text-carmin" aria-label="Se déconnecter">
          <Link href="/" onClick={() => signOut()}>
            <LogOut className="h-4 w-4" strokeWidth={1.5} />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function EspaceShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const pathname = usePathname();
  const current = NAV.find((n) => (n.exact ? pathname === n.href : pathname.startsWith(n.href)));

  React.useEffect(() => { setMobileOpen(false); }, [pathname]);

  return (
    // App-shell plein écran : sidebar + header fixes, seul le contenu défile
    <div className="flex h-screen overflow-hidden bg-porcelaine">
      {/* Sidebar desktop — pleine hauteur */}
      <aside className="hidden lg:flex w-64 flex-none flex-col border-r border-ligne bg-blanc">
        <div className="flex-none"><Brand /></div>
        <div className="flex-1 overflow-y-auto scroll-fine py-2"><NavList /></div>
        <div className="flex-none"><UserCard /></div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Header fixe — pleine largeur */}
        <header className="flex flex-none h-16 items-center gap-3 border-b border-ligne bg-blanc/90 px-4 backdrop-blur sm:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Ouvrir le menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-blanc p-0 flex flex-col">
              <SheetTitle className="sr-only">Menu candidat</SheetTitle>
              <Brand />
              <div className="flex-1 overflow-y-auto py-2"><NavList onNavigate={() => setMobileOpen(false)} /></div>
              <UserCard />
            </SheetContent>
          </Sheet>

          <nav className="flex items-center gap-1.5 text-sm" aria-label="Fil d'Ariane">
            <Link href="/espace" className="text-ardoise hover:text-lapis">Espace</Link>
            <span className="text-ardoise/50">/</span>
            <span className="font-medium text-encre">{current?.label ?? "Tableau de bord"}</span>
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <Button variant="ghost" size="icon" className="relative text-ardoise hover:text-lapis" aria-label="Notifications">
              <Bell className="h-4 w-4" strokeWidth={1.5} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-ambre" />
            </Button>
            <div className="hidden sm:block"><RoleSelector /></div>
          </div>
        </header>

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
