"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  CreditCard,
  MessageSquare,
  Stamp,
  BedDouble,
  FileCheck,
  User,
  LogOut,
  Bell,
  BellOff,
  CheckCheck,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useDossiersQuery, type EspaceDossierSummary } from "@/hooks/use-primary-dossier";

const NAV_BASE = [
  { href: "/espace", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { href: "/espace/dossier", label: "Mon dossier", icon: FileText },
  { href: "/espace/paiement", label: "Paiement", icon: CreditCard },
  { href: "/espace/messages", label: "Messages", icon: MessageSquare, showBadge: "messages" as const },
  { href: "/espace/attestation", label: "Attestation", icon: Stamp },
  { href: "/espace/logement", label: "Demande de logement", icon: BedDouble },
  { href: "/espace/visa", label: "Mon Visa", icon: FileCheck },
  { href: "/espace/profil", label: "Profil", icon: User },
];

function useUnreadCounts() {
  const dossiersQuery = useDossiersQuery({ refetchInterval: 10_000 });
  const [notifs, setNotifs] = React.useState(0);
  const [items, setItems] = React.useState<
    { id: string; titre: string; message: string; lien?: string | null }[]
  >([]);
  const [notifsDegraded, setNotifsDegraded] = React.useState(false);

  const refreshNotifs = React.useCallback(async () => {
    try {
      const nRes = await fetch("/api/notifications?unread=1");
      if (nRes.ok) {
        const n = await nRes.json();
        setNotifs(n.unreadCount ?? 0);
        setItems(n.notifications ?? []);
        setNotifsDegraded(false);
      } else {
        setNotifsDegraded(true);
      }
    } catch {
      setNotifsDegraded(true);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void refreshNotifs();
    });
    // Polling rapide toutes les 10s pour tenir le badge à jour
    const t = setInterval(() => void refreshNotifs(), 10_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [refreshNotifs]);

  const messages = React.useMemo(() => {
    const list: EspaceDossierSummary[] = dossiersQuery.data ?? [];
    let sum = 0;
    for (const d of list) {
      sum += d.conversation?.nonLusCandidat ?? 0;
    }
    return sum;
  }, [dossiersQuery.data]);

  const badgesDegraded = dossiersQuery.isError || notifsDegraded;

  return {
    messages,
    notifs,
    items,
    refresh: () => {
      void dossiersQuery.refetch();
      void refreshNotifs();
    },
    badgesDegraded,
  };
}

function NavList({
  messageBadge,
  badgesDegraded,
}: {
  messageBadge: number;
  badgesDegraded?: boolean;
}) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {NAV_BASE.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            const showMessagesBadge = item.showBadge === "messages";
            const badge =
              showMessagesBadge && messageBadge > 0
                ? messageBadge
                : showMessagesBadge && badgesDegraded
                  ? "?"
                  : null;
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
                {badge !== null ? (
                  <SidebarMenuBadge
                    className="bg-ambre/15 font-mono text-[10px] text-ambre peer-hover/menu-button:text-ambre peer-data-[active=true]/menu-button:text-ambre"
                    title={typeof badge === "string" ? "Compteur indisponible" : undefined}
                  >
                    {typeof badge === "number" && badge > 99 ? "99+" : badge}
                  </SidebarMenuBadge>
                ) : null}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function Brand() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" asChild tooltip="Espace candidat">
          <Link href="/espace" aria-label="Espace candidat GET Admission">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-lapis font-display text-[11px] font-bold tracking-tight text-blanc shadow-sm">
              GA
            </div>
            <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
              <span className="truncate font-display font-semibold text-encre">GET Admission</span>
              <span className="truncate font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">
                Espace candidat
              </span>
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function UserCard() {
  const { data: session, status } = useSession();
  const u = session?.user;

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5">
        <Loader2 className="h-8 w-8 animate-spin text-ardoise" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2.5 rounded-lg bg-or-pale/40 px-2 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:px-0">
        <div className="relative h-8 w-8 flex-none overflow-hidden rounded-full border border-sidebar-border bg-lapis/10">
          {u?.image ? (
            <Image
              src={u.image}
              alt={`${u.prenom} ${u.nom}`}
              fill
              className="object-cover"
              sizes="32px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-mono text-xs font-semibold text-lapis">
              {u ? `${u.prenom?.[0] ?? ""}${u.nom?.[0] ?? ""}` : ""}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
          <p className="truncate text-sm font-medium text-encre">
            {u?.prenom} {u?.nom}
          </p>
          <p className="truncate font-mono text-[10px] uppercase tracking-eyebrow text-ardoise">
            Candidat
          </p>
        </div>
      </div>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip="Déconnexion"
            className="text-ardoise hover:bg-carmin/5 hover:text-carmin"
            onClick={() => signOut({ callbackUrl: "/connexion" })}
          >
            <LogOut strokeWidth={1.5} />
            <span>Déconnexion</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </div>
  );
}

export function EspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { messages, notifs, items, refresh, badgesDegraded } = useUnreadCounts();
  const current = NAV_BASE.find((n) =>
    n.exact ? pathname === n.href : pathname.startsWith(n.href),
  );

  return (
    <SidebarProvider className="bg-porcelaine has-data-[variant=inset]:bg-porcelaine">
      <Sidebar collapsible="icon" variant="inset" className="border-none">
        <SidebarHeader className="pb-0">
          <Brand />
        </SidebarHeader>
        <SidebarSeparator className="mx-0" />
        <SidebarContent className="scroll-fine gap-0">
          <NavList messageBadge={messages} badgesDegraded={badgesDegraded} />
        </SidebarContent>
        <SidebarFooter>
          <UserCard />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-h-svh overflow-hidden bg-blanc md:max-h-[calc(100svh-1rem)]">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-ligne bg-blanc/90 px-4 backdrop-blur-md sm:px-6">
          <SidebarTrigger className="-ml-1 text-ardoise hover:text-encre" />
          <div className="h-4 w-px bg-ligne" aria-hidden />
          <nav className="flex items-center gap-1.5 text-sm" aria-label="Fil d'Ariane">
            <Link href="/espace" className="text-ardoise hover:text-lapis">
              Espace
            </Link>
            <span className="text-ardoise/50">/</span>
            <span className="font-medium text-encre">{current?.label ?? "Tableau de bord"}</span>
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            {/* Cloche de notifications candidat */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative text-ardoise hover:text-encre"
                  aria-label={notifs > 0 ? `Notifications (${notifs} non lues)` : "Notifications"}
                  onClick={() => void refresh()}
                >
                  <Bell className="h-4 w-4" strokeWidth={1.5} />
                  {notifs > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ambre px-1 font-mono text-[9px] font-bold text-blanc animate-in zoom-in-75 duration-200">
                      {notifs > 9 ? "9+" : notifs}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="border-b border-ligne px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display text-sm font-bold text-encre">Notifications</p>
                    <div className="flex items-center gap-2">
                      {notifs > 0 && (
                        <Badge className="bg-ambre/15 font-mono text-[10px] text-ambre">
                          {notifs} non lue{notifs > 1 ? "s" : ""}
                        </Badge>
                      )}
                      {notifs > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 gap-1 px-2 text-[11px] text-ardoise hover:text-lapis"
                          onClick={async () => {
                            await fetch("/api/notifications", {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ all: true }),
                            });
                            refresh();
                          }}
                        >
                          <CheckCheck className="h-3 w-3" />
                          Tout lire
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="max-h-72 overflow-y-auto scroll-fine">
                  {items.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-8 px-4 text-center">
                      <BellOff className="h-6 w-6 text-ardoise/40" strokeWidth={1.5} />
                      <p className="text-sm text-ardoise">Aucune notification. Tout est à jour.</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-ligne">
                      {items.slice(0, 8).map((n) => (
                        <li key={n.id}>
                          <button
                            className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-porcelaine group"
                            onClick={async () => {
                              await fetch("/api/notifications", {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ ids: [n.id] }),
                              });
                              refresh();
                              if (n.lien) router.push(n.lien);
                            }}
                          >
                            <div className="flex h-8 w-8 flex-none items-center justify-center rounded-md bg-lapis/10 group-hover:bg-lapis/20 transition-colors">
                              <Bell className="h-4 w-4 text-lapis" strokeWidth={1.5} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-encre line-clamp-1">{n.titre}</p>
                              <p className="mt-0.5 text-xs text-ardoise line-clamp-2">{n.message}</p>
                            </div>
                            <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-ambre" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto scroll-fine">
          <div className="w-full p-4 sm:p-6 lg:p-8">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
