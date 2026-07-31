import { db } from "@/lib/db";
import { DossiersClient, type DossierRow } from "@/components/admin/dossiers-client";
import { requireAdminPage } from "@/lib/admin-page-auth";

export default async function AdminDossiersPage() {
  await requireAdminPage("dossiers.read");

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
    etat: d.etat ?? "BROUILLON",
    conseiller: d.conseiller ? `${d.conseiller.prenom} ${d.conseiller.nom}` : "Non affecté",
    date: d.updatedAt.toISOString(),
    frais: d.fraisAgence ?? 0,
  }));

  return <DossiersClient initialData={rows} />;
}
