"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderOpen,
  Building2,
  Wallet,
  Users,
  Stamp,
  Settings,
  LogOut,
  Loader2,
  ShieldAlert,
  IdCard,
  FileStack,
} from "lucide-react";
import { GlobalSearch } from "@/components/admin/global-search";
import { NotificationsBell } from "@/components/admin/notifications-bell";
import { AdminThemeToggle } from "@/components/admin/admin-theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { hasPermission, type Permission } from "@/lib/rbac";
import type { Role } from "@prisma/client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";

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
      { href: "/admin/kyc", label: "Pièces d'identité (KYC)", icon: IdCard, permission: "dossiers.read" },
      { href: "/admin/catalogue", label: "Catalogue", icon: Building2, permission: "catalogue.write" },
      { href: "/admin/matrice", label: "Matrice documentaire", icon: FileStack, permission: "matrice.write" },
    ],
  },
  {
    title: "Gestion",
    items: [
      { href: "/admin/finance", label: "Finance", icon: Wallet, permission: "finance.read" },
      { href: "/admin/utilisateurs", label: "Utilisateurs", icon: Users, permission: "users.read" },
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

function AdminNav() {
  const pathname = usePathname();
  const sections = useFilteredSections();

  return (
    <>
      {sections.map((section) => (
        <SidebarGroup key={section.title}>
          <SidebarGroupLabel className="font-mono text-[10px] uppercase tracking-eyebrow text-ardoise/80">
            {section.title}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {section.items.map((item) => {
                const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      className={cn(
                        "relative transition-colors duration-200 ease-out motion-reduce:transition-none",
                        active && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
                      )}
                    >
                      <Link href={item.href}>
                        <Icon strokeWidth={1.5} />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}

function AdminBrand() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" asChild tooltip="Back-office">
          <Link href="/admin" aria-label="Tableau de bord admin">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-lapis font-display text-[11px] font-bold tracking-tight text-blanc shadow-sm">
              GA
            </div>
            <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
              <span className="truncate font-display font-semibold text-encre">GET Admission</span>
              <span className="truncate font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">
                Back-office
              </span>
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function AdminUser() {
  const { data: session, status } = useSession();
  const u = session?.user;

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5">
        <Loader2 className="h-8 w-8 animate-spin text-ardoise" />
      </div>
    );
  }

  const initiales = u ? `${u.prenom?.[0] ?? ""}${u.nom?.[0] ?? ""}` : "?";
  const roleLabel = (u?.role ?? "").replace(/_/g, " ").toLowerCase();

  return (
    <div className="flex flex-col gap-1">
      <Link
        href="/admin/profil"
        className="flex items-center gap-2.5 rounded-lg bg-or-pale/40 px-2 py-2 transition-colors hover:bg-or-pale/70 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:px-0"
      >
        <Avatar className="h-8 w-8 border border-sidebar-border">
          {u?.image && <AvatarImage src={u.image} alt={`${u.prenom} ${u.nom}`} />}
          <AvatarFallback className="bg-lapis/10 font-mono text-xs font-semibold text-lapis">
            {initiales}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
          <p className="truncate text-sm font-medium text-encre">
            {u?.prenom} {u?.nom}
          </p>
          <p className="truncate font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">{roleLabel}</p>
        </div>
      </Link>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip="Déconnexion"
            className="text-ardoise hover:bg-carmin/5 hover:text-carmin"
            onClick={() => signOut({ callbackUrl: "/back-office" })}
          >
            <LogOut strokeWidth={1.5} />
            <span>Déconnexion</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const sections = useFilteredSections();
  const current = sections
    .flatMap((s) => s.items)
    .find((i) => (i.exact ? pathname === i.href : pathname.startsWith(i.href)));

  return (
    <SidebarProvider className="bg-porcelaine has-data-[variant=inset]:bg-porcelaine">
      <Sidebar collapsible="icon" variant="inset" className="border-none">
        <SidebarHeader className="pb-0">
          <AdminBrand />
        </SidebarHeader>
        <SidebarSeparator className="mx-0" />
        <SidebarContent className="scroll-fine gap-0">
          <AdminNav />
        </SidebarContent>
        <SidebarFooter>
          <AdminUser />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-h-svh overflow-hidden bg-card md:max-h-[calc(100svh-1rem)]">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-ligne bg-card/90 px-4 backdrop-blur-md sm:px-6">
          <SidebarTrigger className="-ml-1 text-ardoise hover:text-encre" />
          <div className="h-4 w-px bg-ligne" aria-hidden />
          <GlobalSearch />
          <div className="ml-auto flex items-center gap-1.5">
            <AdminThemeToggle />
            <NotificationsBell />
          </div>
        </header>

        <div className="flex h-10 shrink-0 items-center border-b border-ligne bg-card px-4 sm:px-6">
          <nav className="flex items-center gap-1.5 text-sm" aria-label="Fil d'Ariane">
            <Link href="/admin" className="text-ardoise hover:text-lapis">
              Admin
            </Link>
            <span className="text-ardoise/50">/</span>
            <span className="font-medium text-encre">{current?.label ?? "Tableau de bord"}</span>
          </nav>
        </div>

        <div className="flex-1 overflow-y-auto scroll-fine">
          <div className="w-full p-4 sm:p-6 lg:p-8">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
