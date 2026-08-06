import type { EtatDossier } from "@prisma/client";
import type { db as Database } from "@/lib/db";

/**
 * États dans lesquels un dossier est "en cours de traitement" côté staff : le candidat
 * ne doit plus pouvoir modifier son profil (infos perso, KYC, profil académique) tant que
 * le dossier est dans un de ces états. Exclut BROUILLON/CORRECTION (encore éditables) et
 * REFUSE/CLOTURE (terminaux — le candidat retrouve la main pour une future candidature).
 */
export const IN_FLIGHT_LOCKED_STATES: readonly EtatDossier[] = [
  "SOUMIS",
  "VERIFICATION",
  "PAIEMENT_ATTENTE",
  "PAIEMENT_CONFIRME",
  "TRANSMIS",
  "ATTENTE_REPONSE",
  "PRE_ADMISSION",
  "ATTESTATION",
] as const;

/** Vrai si le candidat a au moins un dossier "en vol" verrouillant son profil. */
export async function isCandidatProfileLocked(
  db: typeof Database,
  candidatId: string,
): Promise<boolean> {
  const dossier = await db.dossier.findFirst({
    where: { candidatId, etat: { in: IN_FLIGHT_LOCKED_STATES as EtatDossier[] } },
    select: { id: true },
  });
  return !!dossier;
}
