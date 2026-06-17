"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth, type Role, DEMO_USERS } from "@/lib/auth-context";
import { UserRound, ChevronDown, GraduationCap, Headset, Wallet, ShieldCheck, Crown, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_ITEMS: { role: Role; label: string; href: string; icon: React.ElementType; description: string }[] = [
  { role: "candidat", label: "Candidat", href: "/espace", icon: GraduationCap, description: "Espace de suivi du dossier" },
  { role: "conseiller", label: "Conseiller", href: "/admin/dossiers", icon: Headset, description: "Gère les dossiers des candidats" },
  { role: "financier", label: "Financier", href: "/admin/finance", icon: Wallet, description: "Transactions et reçus" },
  { role: "admin", label: "Administrateur", href: "/admin", icon: ShieldCheck, description: "Pilotage de l'agence" },
  { role: "super-admin", label: "Super Admin", href: "/admin/parametres", icon: Crown, description: "Configuration avancée" },
];

export function RoleSelector({ variant = "ghost" }: { variant?: "ghost" | "solid" }) {
  const router = useRouter();
  const { user, signIn, signOut } = useAuth();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" disabled className="gap-2">
        <UserRound className="h-4 w-4" /> Démo
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant === "solid" ? "default" : "ghost"}
          size="sm"
          className={cn("gap-2", variant === "solid" && "bg-lapis text-blanc hover:bg-lapis/90")}
          aria-label="Sélecteur de rôle de démonstration"
        >
          <UserRound className="h-4 w-4" strokeWidth={1.5} />
          {user ? (
            <span className="hidden sm:inline">{user.prenom} · {roleLabel(user.role)}</span>
          ) : (
            <span className="hidden sm:inline">Démo</span>
          )}
          <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 bg-blanc">
        <DropdownMenuLabel className="text-xs font-mono uppercase tracking-eyebrow text-ardoise">
          Explorer en démo
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ROLE_ITEMS.map((item) => {
          const active = user?.role === item.role;
          return (
            <DropdownMenuItem
              key={item.role}
              onClick={() => {
                signIn(item.role);
                router.push(item.href);
              }}
              className={cn("flex flex-col items-start gap-0.5 py-2", active && "bg-porcelaine")}
            >
              <span className="flex items-center gap-2 text-sm font-medium text-encre">
                <item.icon className="h-4 w-4 text-lapis" strokeWidth={1.5} />
                {item.label}
                {active && <span className="ml-1 rounded-full bg-vert/15 px-1.5 py-0.5 text-[10px] font-mono uppercase text-vert">actif</span>}
              </span>
              <span className="pl-6 text-xs text-ardoise">{item.description}</span>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            signOut();
            router.push("/");
          }}
          className="text-carmin focus:text-carmin"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.5} />
          <span className="ml-2">Quitter la démo</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function roleLabel(r: Role): string {
  return ROLE_ITEMS.find((i) => i.role === r)?.label ?? r;
}
