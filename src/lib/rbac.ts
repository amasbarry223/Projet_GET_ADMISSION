import type { Role } from "@prisma/client";

/** Permissions alignées sur la matrice §5 du cahier des charges */
export type Permission =
  | "dashboard"
  | "dossiers.read"
  | "dossiers.write"
  | "dossiers.transmettre"
  | "attestations.emit"
  | "attestations.read"
  | "finance.read"
  | "finance.write"
  | "catalogue.write"
  | "matrice.write"
  | "users.read"
  | "users.write"
  | "parametres.read"
  | "parametres.write"
  | "audit.read"
  | "roles.write"
  | "backup.manage"
  | "kyc.read"
  | "kyc.write"
  | "dossiers.assign"
  | "candidats.read"
  | "candidats.write"
  | "messages.internes"
  | "etablissement.assign"
  | "logement.read"
  | "logement.write";

const MATRIX: Record<Role, Permission[]> = {
  CANDIDAT: [],
  CONSEILLER: [
    "dashboard",
    "dossiers.read",
    "dossiers.write",
    "dossiers.transmettre",
    "attestations.read",
    "attestations.emit", // ◐ — émission autorisée
    "kyc.read", // ◐ — consultation uniquement, pas de modification
    "etablissement.assign", // procédure Université Publique — affecte l'établissement réel
    "messages.internes", // écrit à l'Admin/Super Admin — même fil interne que le Financier
    "logement.read",
    "logement.write",
  ],
  FINANCIER: [
    "dashboard",
    "dossiers.read", // ◐ consultation
    "finance.read",
    "finance.write",
    "messages.internes", // écrit à l'Admin/Super Admin — pas d'affectation ni de transmission
  ],
  ADMIN: [
    "dashboard",
    "dossiers.read",
    "dossiers.write",
    // dossiers.transmettre volontairement absent : Admin ne transmet plus à l'université (chaque
    // université a son propre canal distinct) — action réservée à Conseiller et Super Admin.
    "dossiers.assign",
    "attestations.read",
    "attestations.emit",
    "finance.read",
    "finance.write", // ◐
    "catalogue.write",
    "matrice.write",
    "users.read",
    "parametres.read", // ◐
    "kyc.read",
    "kyc.write",
    "candidats.read",
    "candidats.write",
    "messages.internes",
    "etablissement.assign",
    "logement.read",
    "logement.write",
  ],
  SUPER_ADMIN: [
    "dashboard",
    "dossiers.read",
    "dossiers.write",
    "dossiers.transmettre",
    "dossiers.assign",
    "attestations.read",
    "attestations.emit",
    "finance.read",
    "finance.write",
    "catalogue.write",
    "matrice.write",
    "users.read",
    "users.write",
    "parametres.read",
    "parametres.write",
    "audit.read",
    "roles.write",
    "messages.internes",
    "backup.manage",
    "kyc.read",
    "kyc.write",
    "candidats.read",
    "candidats.write",
    "etablissement.assign",
    "logement.read",
    "logement.write",
  ],
};

export const STAFF_ROLES: Role[] = ["CONSEILLER", "FINANCIER", "ADMIN", "SUPER_ADMIN"];

export function isStaff(role: string | undefined | null): boolean {
  return STAFF_ROLES.includes(role as Role);
}

export function hasPermission(role: string | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  const perms = MATRIX[role as Role];
  return perms?.includes(permission) ?? false;
}

export function requirePermission(
  role: string | undefined | null,
  permission: Permission
): { ok: true } | { ok: false; status: 401 | 403; error: string } {
  if (!role) return { ok: false, status: 401, error: "Non authentifié" };
  if (!hasPermission(role, permission)) {
    return { ok: false, status: 403, error: "Accès refusé pour ce rôle" };
  }
  return { ok: true };
}

/** Mapping chemin admin → permission requise */
export function permissionForAdminPath(pathname: string): Permission | null {
  if (pathname === "/admin" || pathname === "/admin/") return "dashboard";
  if (pathname.startsWith("/admin/dossiers")) return "dossiers.read";
  if (pathname.startsWith("/admin/kyc")) return "kyc.read";
  if (pathname.startsWith("/admin/catalogue")) return "catalogue.write";
  if (pathname.startsWith("/admin/matrice")) return "matrice.write";
  if (pathname.startsWith("/admin/finance")) return "finance.read";
  if (pathname.startsWith("/admin/utilisateurs")) return "users.read";
  if (pathname.startsWith("/admin/attestations")) return "attestations.read";
  if (pathname.startsWith("/admin/parametres")) return "parametres.read";
  if (pathname.startsWith("/admin/audit")) return "audit.read";
  if (pathname.startsWith("/admin/messages-internes")) return "messages.internes";
  if (pathname.startsWith("/admin/logement")) return "logement.read";
  return "dashboard";
}

/** Première route admin accessible selon le rôle (redirect post-login) */
export function defaultAdminRoute(role: Role | string): string {
  switch (role) {
    case "FINANCIER":
      return "/admin/finance";
    case "CONSEILLER":
      return "/admin/dossiers";
    default:
      return "/admin";
  }
}
