import { db } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-page-auth";
import { LogementTabsClient } from "@/components/admin/logement-tabs-client";
import type { LogementRow } from "@/components/admin/logement-client";

export default async function AdminLogementPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireAdminPage("logement.read");
  const { tab } = await searchParams;

  const [reservations, demandesCrous] = await Promise.all([
    db.logementReservation.findMany({ orderBy: { createdAt: "desc" } }),
    db.demandeLogementCrous.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  const reservationData: LogementRow[] = reservations.map((r) => ({
    id: r.id,
    candidat: `${r.prenom} ${r.nom}`,
    email: r.email,
    ville: r.villeEtablissementFrance,
    nationalite: r.nationalite,
    statut: r.statut,
    soumiseLe: r.createdAt.toISOString(),
  }));

  const crousData: LogementRow[] = demandesCrous.map((r) => ({
    id: r.id,
    candidat: `${r.prenom} ${r.nom}`,
    email: r.email,
    ville: r.villeEtablissementFrance,
    nationalite: r.nationalite,
    statut: r.statut,
    soumiseLe: r.createdAt.toISOString(),
  }));

  return (
    <LogementTabsClient
      defaultTab={tab === "crous" ? "crous" : "reservation"}
      reservationData={reservationData}
      crousData={crousData}
    />
  );
}
