import type { Role } from "@prisma/client";
import { STAFF_ROLES } from "@/lib/rbac";

/** Rôles gérables depuis la page Personnel (hors candidats). */
export const INTERNAL_ROLES: Role[] = ["CONSEILLER", "FINANCIER", "ADMIN", "SUPER_ADMIN"];

export function isInternalRole(role: string | null | undefined): boolean {
  return INTERNAL_ROLES.includes(role as Role);
}

export function isStaffManagementRole(role: string | null | undefined): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

/**
 * Un ADMIN ne peut ni créer, ni modifier, ni supprimer un SUPER_ADMIN.
 * Seul un SUPER_ADMIN peut gérer un autre SUPER_ADMIN.
 */
export function canManageTargetUser(actorRole: string, targetRole: string): boolean {
  if (!isStaffManagementRole(actorRole)) return false;
  // Personnel uniquement — jamais un compte candidat via /api/admin/users
  if (!isInternalRole(targetRole)) return false;
  if (targetRole === "SUPER_ADMIN" && actorRole !== "SUPER_ADMIN") return false;
  return true;
}

/** Rôles qu'un acteur peut attribuer à la création / édition. */
export function assignableRoles(actorRole: string): Role[] {
  if (actorRole === "SUPER_ADMIN") {
    return ["CONSEILLER", "FINANCIER", "ADMIN", "SUPER_ADMIN"];
  }
  if (actorRole === "ADMIN") {
    return ["CONSEILLER", "FINANCIER", "ADMIN"];
  }
  return [];
}

export function canAssignRole(actorRole: string, newRole: string): boolean {
  return assignableRoles(actorRole).includes(newRole as Role);
}

export { STAFF_ROLES };
