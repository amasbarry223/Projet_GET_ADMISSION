import type { DemandeCorrection, Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

/**
 * Ouvre une nouvelle demande de correction (conseiller → candidat) et clôt
 * toute demande précédente encore non résolue sur ce dossier (boucle
 * correction ↔ vérification : chaque relance remplace la précédente).
 */
export async function requestCorrection(
  tx: Tx,
  params: { dossierId: string; conseillerId: string; motif: string },
): Promise<DemandeCorrection> {
  await tx.demandeCorrection.updateMany({
    where: {
      dossierId: params.dossierId,
      statut: { in: ["EN_ATTENTE", "SOUMISE"] },
    },
    data: { statut: "REMPLACEE", traiteeLe: new Date() },
  });

  return tx.demandeCorrection.create({
    data: {
      dossierId: params.dossierId,
      conseillerId: params.conseillerId,
      motif: params.motif,
      statut: "EN_ATTENTE",
    },
  });
}

/**
 * Marque la demande de correction en attente comme soumise (le candidat a
 * renvoyé son dossier). Déclenché par la resoumission candidat ou par la
 * prise en compte manuelle du conseiller.
 */
export async function markCorrectionSubmitted(
  tx: Tx,
  dossierId: string,
): Promise<DemandeCorrection | null> {
  const pending = await tx.demandeCorrection.findFirst({
    where: { dossierId, statut: "EN_ATTENTE" },
    orderBy: { createdAt: "desc" },
  });
  if (!pending) return null;

  return tx.demandeCorrection.update({
    where: { id: pending.id },
    data: { statut: "SOUMISE", soumiseLe: new Date() },
  });
}

/**
 * Marque la dernière correction soumise comme conforme : le conseiller a
 * validé le dossier, ce qui clôt le cycle de correction en cours.
 */
export async function markCorrectionValidated(
  tx: Tx,
  dossierId: string,
): Promise<DemandeCorrection | null> {
  const submitted = await tx.demandeCorrection.findFirst({
    where: { dossierId, statut: "SOUMISE" },
    orderBy: { createdAt: "desc" },
  });
  if (!submitted) return null;

  return tx.demandeCorrection.update({
    where: { id: submitted.id },
    data: { statut: "VALIDEE", traiteeLe: new Date() },
  });
}
