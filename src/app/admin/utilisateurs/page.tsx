import { db } from "@/lib/db";
import { UtilisateursClient, type UserRow } from "@/components/admin/utilisateurs-client";
import { requireAdminPage } from "@/lib/admin-page-auth";
import { INTERNAL_ROLES } from "@/lib/admin-users";

export default async function AdminUtilisateursPage() {
  const session = await requireAdminPage("users.write");
  const currentRole = (session.user as { role?: string }).role ?? "ADMIN";
  const currentUserId = (session.user as { id?: string }).id ?? "";

  const users = await db.user.findMany({
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
  });

  const rows: UserRow[] = users.map((u) => ({
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

  return (
    <UtilisateursClient
      initialData={rows}
      currentRole={currentRole as "ADMIN" | "SUPER_ADMIN"}
      currentUserId={currentUserId}
    />
  );
}
