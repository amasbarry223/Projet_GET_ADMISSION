import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { UtilisateursClient, type UserRow } from "@/components/admin/utilisateurs-client";

// Server component — fetches all staff users via Prisma (no client waterfall).
// Auth: any staff member (not CANDIDAT).
export default async function AdminUtilisateursPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role === "CANDIDAT") redirect("/connexion");

  const users = await db.user.findMany({
    select: {
      id: true,
      email: true,
      prenom: true,
      nom: true,
      role: true,
      actif: true,
      createdAt: true,
      _count: { select: { dossiersConseiller: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const mapRole = (dbRole: string): UserRow["role"] => {
    switch (dbRole) {
      case "CONSEILLER":
        return "Conseiller";
      case "FINANCIER":
        return "Financier";
      case "ADMIN":
        return "Admin";
      case "SUPER_ADMIN":
        return "Super Admin";
      default:
        return "Conseiller";
    }
  };

  const rows: UserRow[] = users.map((u) => ({
    id: u.id,
    email: u.email,
    nom: `${u.prenom} ${u.nom}`,
    initiales: `${u.prenom[0] ?? ""}${u.nom[0] ?? ""}`,
    role: mapRole(u.role),
    dossiers: u._count.dossiersConseiller,
    date: u.createdAt.toISOString(),
    actif: u.actif,
  }));

  return <UtilisateursClient initialData={rows} />;
}
