import { db } from "@/lib/db";
import {
  AttestationsClient,
  type AttestationDossier,
  type ModeleAttestation as ModeleAttestationProp,
} from "@/components/admin/attestations-client";
import { requireAdminPage } from "@/lib/admin-page-auth";

export default async function AdminAttestationsPage() {
  await requireAdminPage("attestations.read");

  // The detail page only needs a subset of fields per dossier.
  const select = {
    id: true,
    reference: true,
    etat: true,
    updatedAt: true,
    candidat: { select: { prenom: true, nom: true } },
    universite: { select: { nom: true, ecusson: true } },
    formation: { select: { intitule: true } },
  } as const;

  const [aEmettreRaw, emisesRaw, modelesRaw] = await Promise.all([
    db.dossier.findMany({
      where: { etat: "PRE_ADMISSION" },
      select,
      orderBy: { updatedAt: "asc" },
    }),
    db.dossier.findMany({
      where: { etat: { in: ["ATTESTATION", "CLOTURE"] } },
      select,
      orderBy: { updatedAt: "desc" },
    }),
    db.modeleAttestation.findMany({ where: { actif: true }, orderBy: { ordre: "asc" } }),
  ]);

  const mapDossier = (d: typeof aEmettreRaw[number]): AttestationDossier => ({
    id: d.id,
    reference: d.reference,
    etat: d.etat,
    updatedAt: d.updatedAt.toISOString(),
    candidatPrenom: d.candidat?.prenom ?? "",
    candidatNom: d.candidat?.nom ?? "",
    universiteNom: d.universite?.nom ?? "—",
    universiteEcusson: d.universite?.ecusson ?? "—",
    formationIntitule: d.formation?.intitule ?? "",
  });

  const modeles: ModeleAttestationProp[] = modelesRaw.map((m) => ({
    id: m.id,
    nom: m.nom,
    description: m.description,
    nbUsages: m.nbUsages,
    actif: m.actif,
    ordre: m.ordre,
  }));

  return (
    <AttestationsClient
      initialAEmettre={aEmettreRaw.map(mapDossier)}
      initialEmises={emisesRaw.map(mapDossier)}
      initialModeles={modeles}
    />
  );
}
