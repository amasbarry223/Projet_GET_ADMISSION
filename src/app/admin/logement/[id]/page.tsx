import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-page-auth";
import { LogementDetailClient } from "@/components/admin/logement-detail-client";

export default async function AdminLogementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage("logement.read");
  const { id } = await params;

  const reservation = await db.logementReservation.findUnique({
    where: { id },
    include: { candidat: { select: { prenom: true, nom: true, email: true } } },
  });
  if (!reservation) notFound();

  return (
    <LogementDetailClient
      reservation={{
        id: reservation.id,
        civilite: reservation.civilite,
        nom: reservation.nom,
        prenom: reservation.prenom,
        dateNaissance: reservation.dateNaissance,
        nationalite: reservation.nationalite,
        telephone: reservation.telephone,
        email: reservation.email,
        agenceAccompagnante: reservation.agenceAccompagnante,
        numeroPasseport: reservation.numeroPasseport,
        paysDemandeVisa: reservation.paysDemandeVisa,
        villeEtablissementFrance: reservation.villeEtablissementFrance,
        dateArriveePrevue: reservation.dateArriveePrevue,
        statut: reservation.statut,
        motifCorrection: reservation.motifCorrection,
        createdAt: reservation.createdAt.toISOString(),
        candidatNomComplet: `${reservation.candidat.prenom} ${reservation.candidat.nom}`,
      }}
    />
  );
}
