import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-page-auth";
import { DemandeCrousDetailClient } from "@/components/admin/logement-crous-detail-client";

export default async function AdminDemandeCrousDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage("logement.read");
  const { id } = await params;

  let demande = await db.demandeLogementCrous.findUnique({
    where: { id },
    include: { candidat: { select: { prenom: true, nom: true, email: true } } },
  });
  if (!demande) notFound();

  // Ouvrir la fiche vaut prise en charge implicite : le candidat voit alors que sa
  // demande est activement suivie, pas juste en attente.
  if (demande.statut === "soumis") {
    demande = await db.demandeLogementCrous.update({
      where: { id },
      data: { statut: "en_cours_traitement" },
      include: { candidat: { select: { prenom: true, nom: true, email: true } } },
    });
  }

  return (
    <DemandeCrousDetailClient
      demande={{
        id: demande.id,
        nom: demande.nom,
        prenom: demande.prenom,
        nomUsage: demande.nomUsage,
        dateNaissance: demande.dateNaissance,
        lieuNaissance: demande.lieuNaissance,
        paysNaissance: demande.paysNaissance,
        nationalite: demande.nationalite,
        sexe: demande.sexe,
        telephone: demande.telephone,
        email: demande.email,
        villeEtablissementFrance: demande.villeEtablissementFrance,
        fichierPasseportRectoUrl: demande.fichierPasseportRectoUrl,
        fichierPasseportVersoUrl: demande.fichierPasseportVersoUrl,
        fichierAttestationAccordPrealableUrl: demande.fichierAttestationAccordPrealableUrl,
        statut: demande.statut,
        motifCorrection: demande.motifCorrection,
        createdAt: demande.createdAt.toISOString(),
        candidatNomComplet: `${demande.candidat.prenom} ${demande.candidat.nom}`,
      }}
    />
  );
}
