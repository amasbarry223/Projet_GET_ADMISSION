import { db } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-page-auth";
import { LogementClient, type LogementRow } from "@/components/admin/logement-client";

export default async function AdminLogementPage() {
  await requireAdminPage("logement.read");

  const reservations = await db.logementReservation.findMany({
    orderBy: { createdAt: "desc" },
  });

  const data: LogementRow[] = reservations.map((r) => ({
    id: r.id,
    candidat: `${r.prenom} ${r.nom}`,
    email: r.email,
    ville: r.villeEtablissementFrance,
    arrivee: r.dateArriveePrevue,
    statut: r.statut,
    soumiseLe: r.createdAt.toISOString(),
  }));

  return <LogementClient initialData={data} />;
}
