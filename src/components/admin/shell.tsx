"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { LayoutDashboard, FolderOpen, Building2, Wallet, Users, Stamp, Settings, LogOut, Menu, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { GlobalSearch } from "@/components/admin/global-search";
import { NotificationsBell } from "@/components/admin/notifications-bell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BrandLogo } from "@/components/brand-logo";
import { hasPermission, type Permission } from "@/lib/rbac";
import type { Role } from "@prisma/client";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  exact?: boolean;
  permission: Permission;
};

const SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Pilotage",
    items: [{ href: "/admin", label: "Tableau de bord", icon: LayoutDashboard, exact: true, permission: "dashboard" }],
  },
  {
    title: "Dossiers",
    items: [
      { href: "/admin/dossiers", label: "Tous les dossiers", icon: FolderOpen, permission: "dossiers.read" },
      { href: "/admin/catalogue", label: "Catalogue", icon: Building2, permission: "catalogue.write" },
    ],
  },
  {
    title: "Gestion",
    items: [
      { href: "/admin/finance", label: "Finance", icon: Wallet, permission: "finance.read" },
      { href: "/admin/utilisateurs", label: "Utilisateurs", icon: Users, permission: "users.write" },
      { href: "/admin/attestations", label: "Attestations", icon: Stamp, permission: "attestations.read" },
    ],
  },
  {
    title: "Système",
    items: [
      { href: "/admin/parametres", label: "Paramètres", icon: Settings, permission: "parametres.read" },
      { href: "/admin/audit", label: "Journaux d'audit", icon: ShieldAlert, permission: "audit.read" },
    ],
  },
];

function useFilteredSections() {
  const { data: session } = useSession();
  const role = session?.user?.role as Role | undefined;
  return React.useMemo(() => {
    return SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter((item) => hasPermission(role, item.permission)),
    })).filter((s) => s.items.length > 0);
  }, [role]);
}

function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const sections = useFilteredSections();
  return (
    <nav className="flex flex-col gap-5 px-3 py-4" aria-label="Navigation administration">
      {sections.map((section) => (
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
                      active
                        ? "bg-lapis/8 text-lapis shadow-[inset_0_0_0_1px_rgba(60,169,54,0.15)]"
                        : "text-encre/75 hover:bg-porcelaine hover:text-lapis hover:shadow-[0_2px_8px_rgba(60,169,54,0.12)]"
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
    <Link href="/admin" className="flex flex-col gap-1 px-4 py-4" aria-label="Tableau de bord admin">
      <BrandLogo height={32} />
      <span className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">Back-office</span>
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
  const initiales = u ? `${u.prenom?.[0] ?? ""}${u.nom?.[0] ?? ""}` : "?";
  return (
    <div className="border-t border-ligne p-3 space-y-1">
      <div className="flex items-center gap-2.5 rounded-md p-2">
        <Avatar className="h-8 w-8 border border-ligne">
          <AvatarFallback className="bg-lapis/10 font-mono text-xs font-semibold text-lapis">{initiales}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-encre">{u?.prenom} {u?.nom}</p>
          <p className="truncate text-xs capitalize text-ardoise">{(u?.role ?? "").replace(/_/g, " ").toLowerCase()}</p>
        </div>
      </div>
      <Button
        variant="ghost"
        className="h-9 w-full justify-start gap-2 px-3 text-ardoise hover:bg-carmin/5 hover:text-carmin"
        onClick={() => signOut({ callbackUrl: "/connexion" })}
      >
        <LogOut className="h-4 w-4" strokeWidth={1.5} />
        Déconnexion
      </Button>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const sections = useFilteredSections();

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const current = sections.flatMap((s) => s.items).find((i) => (i.exact ? pathname === i.href : pathname.startsWith(i.href)));

  return (
    <div className="flex h-screen overflow-hidden bg-porcelaine">
      <aside className="hidden lg:flex w-60 flex-none flex-col border-r border-ligne bg-blanc">
        <div className="flex-none">
          <AdminBrand />
        </div>
        <div className="flex-1 overflow-y-auto scroll-fine">
          <AdminNav />
        </div>
        <div className="flex-none">
          <AdminUser />
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
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
              <div className="flex-1 overflow-y-auto">
                <AdminNav onNavigate={() => setOpen(false)} />
              </div>
              <AdminUser />
            </SheetContent>
          </Sheet>

          <GlobalSearch />

          <div className="ml-auto flex items-center gap-1.5">
            <NotificationsBell />
          </div>
        </header>

        <div className="flex flex-none items-center h-10 border-b border-ligne bg-blanc px-4 sm:px-6">
          <nav className="flex items-center gap-1.5 text-sm" aria-label="Fil d'Ariane">
            <Link href="/admin" className="text-ardoise hover:text-lapis">
              Admin
            </Link>
            <span className="text-ardoise/50">/</span>
            <span className="font-medium text-encre">{current?.label ?? "Tableau de bord"}</span>
          </nav>
        </div>

        <main className="flex-1 overflow-y-auto scroll-fine">
          <div className="w-full p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
