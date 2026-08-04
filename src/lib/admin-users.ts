import type { Role } from "@prisma/client";
import { STAFF_ROLES } from "@/lib/rbac";

/** Rôles gérables depuis la page Personnel (hors candidats). */
export const INTERNAL_ROLES: Role[] = ["CONSEILLER", "FINANCIER", "ADMIN", "SUPER_ADMIN"];

export function isInternalRole(role: string | null | undefined): boolean {
  return INTERNAL_ROLES.includes(role as Role);
}

/** Seul un SUPER_ADMIN peut créer, modifier, suspendre, supprimer ou reset le personnel. */
export function isStaffManagementRole(role: string | null | undefined): boolean {
  return role === "SUPER_ADMIN";
}

/**
 * Seul un SUPER_ADMIN peut gérer le personnel.
 * Un ADMIN ne peut ni modifier, ni supprimer, ni créer un SUPER_ADMIN.
 */
export function canManageTargetUser(actorRole: string, targetRole: string): boolean {
  if (!isStaffManagementRole(actorRole)) return false;
  if (!isInternalRole(targetRole)) return false;
  // Défense en profondeur : aucun acteur non–Super Admin ne touche un Super Admin
  if (targetRole === "SUPER_ADMIN" && actorRole !== "SUPER_ADMIN") return false;
  return true;
}

/** Rôles qu'un acteur peut attribuer à la création / édition. */
export function assignableRoles(actorRole: string): Role[] {
  if (actorRole === "SUPER_ADMIN") {
    return ["CONSEILLER", "FINANCIER", "ADMIN", "SUPER_ADMIN"];
  }
  return [];
}

export function canAssignRole(actorRole: string, newRole: string): boolean {
  return assignableRoles(actorRole).includes(newRole as Role);
}

/** Message d'erreur lorsqu'un Admin tente de gérer un Super Admin. */
export function staffManageDeniedMessage(actorRole: string, targetRole: string): string {
  if (!isInternalRole(targetRole)) {
    return "Les comptes candidats se gèrent hors de la page Personnel";
  }
  if (targetRole === "SUPER_ADMIN" && actorRole !== "SUPER_ADMIN") {
    return "Seul un super-administrateur peut gérer un compte Super Admin";
  }
  if (!isStaffManagementRole(actorRole)) {
    return "Seul un super-administrateur peut gérer le personnel";
  }
  return "Accès refusé";
}

export { STAFF_ROLES };
