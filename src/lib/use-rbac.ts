"use client";

import { useSession } from "next-auth/react";
import type { Role } from "@prisma/client";

type RoleLower = "candidat" | "conseiller" | "financier" | "admin" | "super-admin";

/**
 * Hook RBAC — vérifie les permissions basées sur le rôle de l'utilisateur connecté.
 */
export function useRBAC() {
  const { data: session, status } = useSession();

  const role = (session?.user?.role ?? null) as Role | null;
  const isAuthenticated = status === "authenticated";
  const isLoading = status === "loading";

  const hasRole = (roles: Role | Role[]) => {
    if (!role) return false;
    const arr = Array.isArray(roles) ? roles : [roles];
    return arr.includes(role);
  };

  const isCandidat = role === "CANDIDAT";
  const isConseiller = role === "CONSEILLER";
  const isFinancier = role === "FINANCIER";
  const isAdmin = role === "ADMIN";
  const isSuperAdmin = role === "SUPER_ADMIN";
  const isStaff = isConseiller || isFinancier || isAdmin || isSuperAdmin;

  return {
    session,
    status,
    role,
    isAuthenticated,
    isLoading,
    hasRole,
    isCandidat,
    isConseiller,
    isFinancier,
    isAdmin,
    isSuperAdmin,
    isStaff,
    user: session?.user,
  };
}
