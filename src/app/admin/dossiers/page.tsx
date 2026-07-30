import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { DossiersClient, type DossierRow } from "@/components/admin/dossiers-client";

// Server component — fetches all dossiers via Prisma (no client waterfall).
// Auth: any staff member (not CANDIDAT).
export default async function AdminDossiersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role === "CANDIDAT") redirect("/connexion");

  const dossiers = await db.dossier.findMany({
    include: {
      candidat: { select: { prenom: true, nom: true } },
      universite: { select: { id: true, nom: true } },
      formation: { select: { intitule: true } },
      conseiller: { select: { prenom: true, nom: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const rows: DossierRow[] = dossiers.map((d) => ({
    id: d.id,
    reference: d.reference,
    candidat: `${d.candidat?.prenom ?? ""} ${d.candidat?.nom ?? ""}`.trim(),
    universite: d.universite?.nom ?? "—",
    formation: d.formation?.intitule ?? "",
    etat: (d.etat ?? "").toLowerCase(),
    conseiller: d.conseiller ? `${d.conseiller.prenom} ${d.conseiller.nom}` : "Non affecté",
    date: d.updatedAt.toISOString(),
    frais: d.fraisAgence ?? 0,
  }));

  return <DossiersClient initialData={rows} />;
}
