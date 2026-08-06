import { db } from "@/lib/db";
import { type UserRow } from "@/components/admin/utilisateurs-client";
import type { CandidatRow } from "@/components/admin/candidats-client";
import { PersonnelRolesClient } from "@/components/admin/personnel-roles-client";
import { requireAdminPage } from "@/lib/admin-page-auth";
import { INTERNAL_ROLES } from "@/lib/admin-users";
import { hasPermission } from "@/lib/rbac";

export default async function AdminUtilisateursPage() {
  const session = await requireAdminPage("users.read");
  const currentRole = session.user.role ?? "ADMIN";
  const currentUserId = session.user.id;

  const [users, candidats] = await Promise.all([
    db.user.findMany({
      where: { role: { in: INTERNAL_ROLES } },
      select: {
        id: true,
        email: true,
        prenom: true,
        nom: true,
        role: true,
        actif: true,
        createdAt: true,
        lastLoginAt: true,
        _count: {
          select: {
            dossiersConseiller: true,
          },
        },
        dossiersConseiller: {
          where: { etat: { notIn: ["CLOTURE", "REFUSE"] } },
          select: { id: true },
        },
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    }),
    db.user.findMany({
      where: { role: "CANDIDAT" },
      select: {
        id: true,
        email: true,
        prenom: true,
        nom: true,
        telephone: true,
        nationalite: true,
        actif: true,
        kycVerifie: true,
        createdAt: true,
        lastLoginAt: true,
        _count: { select: { dossiersCandidat: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const staffRows: UserRow[] = users.map((u) => ({
    id: u.id,
    email: u.email,
    prenom: u.prenom,
    nomFamille: u.nom,
    nom: `${u.prenom} ${u.nom}`,
    initiales: `${u.prenom[0] ?? ""}${u.nom[0] ?? ""}`,
    role: u.role as UserRow["role"],
    dossiers: u._count.dossiersConseiller,
    dossiersOuverts: u.dossiersConseiller.length,
    date: u.createdAt.toISOString(),
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    actif: u.actif,
  }));

  const candidatRows: CandidatRow[] = candidats.map((c) => ({
    id: c.id,
    prenom: c.prenom,
    nom: c.nom,
    email: c.email,
    telephone: c.telephone,
    nationalite: c.nationalite,
    actif: c.actif,
    kycVerifie: c.kycVerifie,
    dossiers: c._count.dossiersCandidat,
    date: c.createdAt.toISOString(),
    lastLoginAt: c.lastLoginAt?.toISOString() ?? null,
  }));

  return (
    <PersonnelRolesClient
      staff={staffRows}
      candidats={candidatRows}
      currentRole={currentRole as "ADMIN" | "SUPER_ADMIN"}
      currentUserId={currentUserId}
      canWriteCandidats={hasPermission(currentRole, "candidats.write")}
    />
  );
}
