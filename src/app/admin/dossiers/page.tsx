import { db } from "@/lib/db";
import { DossiersClient, type DossierRow } from "@/components/admin/dossiers-client";
import { requireAdminPage } from "@/lib/admin-page-auth";

export default async function AdminDossiersPage() {
  const session = await requireAdminPage("dossiers.read");

  // Le conseiller ne voit que les dossiers qui lui sont affectés — pas ceux pris en charge
  // par un autre conseiller, un Admin ou un Super Admin.
  const where = session.user.role === "CONSEILLER" ? { conseillerId: session.user.id } : {};

  const dossiers = await db.dossier.findMany({
    where,
    include: {
      candidat: { select: { prenom: true, nom: true } },
      universite: { select: { id: true, nom: true, estPlaceholder: true } },
      formation: { select: { intitule: true } },
      conseiller: { select: { prenom: true, nom: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const rows: DossierRow[] = dossiers.map((d) => {
    const etablissementNonAffecte = d.procedure === "PUBLIQUE" && !!d.universite?.estPlaceholder;
    return {
      id: d.id,
      reference: d.reference,
      candidat: `${d.candidat?.prenom ?? ""} ${d.candidat?.nom ?? ""}`.trim(),
      universite: etablissementNonAffecte ? "Publique — en attente d'affectation" : (d.universite?.nom ?? "—"),
      formation: d.formation?.intitule ?? "",
      etat: d.etat ?? "BROUILLON",
      procedure: d.procedure ?? "PRIVEE",
      etablissementNonAffecte,
      conseiller: d.conseiller ? `${d.conseiller.prenom} ${d.conseiller.nom}` : "Non affecté",
      date: d.updatedAt.toISOString(),
      frais: d.fraisAgence ?? 0,
    };
  });

  return <DossiersClient initialData={rows} />;
}
