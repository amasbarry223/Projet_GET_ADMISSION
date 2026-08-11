import { requireAdminPage } from "@/lib/admin-page-auth";
import { db } from "@/lib/db";
import { AdminVisaClient, type AdminVisaItem } from "@/components/admin/visa-client";

export default async function AdminVisaPage() {
  await requireAdminPage("dossiers.read");

  const visas = await db.demandeVisa.findMany({
    include: {
      candidat: {
        select: {
          id: true,
          prenom: true,
          nom: true,
          email: true,
          telephone: true,
          nationalite: true,
          photoUrl: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  }).catch(() => []);

  const initialData: AdminVisaItem[] = visas.map((v) => ({
    id: v.id,
    candidatId: v.candidatId,
    candidatNom: `${v.candidat.prenom} ${v.candidat.nom}`,
    candidatEmail: v.candidat.email,
    candidatTelephone: v.candidat.telephone ?? "Non renseigné",
    candidatNationalite: v.candidat.nationalite ?? "Non renseigné",
    statut: v.statut,
    fichierVisaUrl: v.fichierVisaUrl,
    motifRefus: v.motifRefus,
    remarqueAdmin: v.remarqueAdmin,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  }));

  return <AdminVisaClient initialData={initialData} />;
}
