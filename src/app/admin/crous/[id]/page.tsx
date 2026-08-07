import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin-page-auth";
import { fetchDemandeCrous, getAvailableAttachments } from "@/lib/crous/partage";
import { CrousDetailClient, type CrousDetailData } from "@/components/admin/crous-detail-client";

export default async function AdminCrousDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage("crous.manage");
  const { id } = await params;

  const demande = await fetchDemandeCrous(id);
  if (!demande) notFound();

  const disponibilite = getAvailableAttachments(demande);

  const data: CrousDetailData = {
    id: demande.id,
    statut: demande.statut,
    createdAt: demande.createdAt.toISOString(),
    updatedAt: demande.updatedAt.toISOString(),
    dossier: {
      id: demande.dossier.id,
      reference: demande.dossier.reference,
      etat: demande.dossier.etat,
      candidat: {
        prenom: demande.dossier.candidat.prenom,
        nom: demande.dossier.candidat.nom,
        email: demande.dossier.candidat.email,
        telephone: demande.dossier.candidat.telephone,
      },
      universite: demande.dossier.universite.nom,
      formation: demande.dossier.formation.intitule,
    },
    documents: demande.documents.map((doc) => ({
      id: doc.id,
      libelle: doc.libelle,
      nomFichier: doc.nomFichier,
      taille: doc.taille,
      televerseLe: doc.televerseLe.toISOString(),
    })),
    partages: demande.partages.map((p) => ({
      id: p.id,
      destinataire: p.destinataire,
      methode: p.methode,
      documents: p.documents,
      statut: p.statut,
      erreur: p.erreur,
      createdAt: p.createdAt.toISOString(),
    })),
    disponibilite,
  };

  return <CrousDetailClient initialData={data} />;
}
