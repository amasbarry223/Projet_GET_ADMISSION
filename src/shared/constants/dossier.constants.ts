import type { EtatDossier } from "@prisma/client";

/** États dans lesquels le candidat peut encore modifier son dossier. */
export const EDITABLE_DOSSIER_STATES: readonly EtatDossier[] = [
  "BROUILLON",
  "CORRECTION",
] as const;

/** États considérés comme terminaux / non réouvrables pour une nouvelle candidature. */
export const CLOSED_DOSSIER_STATES: readonly EtatDossier[] = [
  "REFUSE",
  "CLOTURE",
] as const;

/** États « en cours » pour stats admin / dashboard. */
export const IN_PROGRESS_DOSSIER_STATES: readonly EtatDossier[] = [
  "BROUILLON",
  "SOUMIS",
  "VERIFICATION",
  "CORRECTION",
  "PAIEMENT_ATTENTE",
  "PAIEMENT_CONFIRME",
  "TRANSMIS",
  "ATTENTE_REPONSE",
  "PRE_ADMISSION",
  "ATTESTATION",
] as const;

/** Pipeline opérationnel (hors brouillon / décisions finales) — KPI admin. */
export const PIPELINE_DOSSIER_STATES: readonly EtatDossier[] = [
  "SOUMIS",
  "VERIFICATION",
  "CORRECTION",
  "PAIEMENT_ATTENTE",
  "PAIEMENT_CONFIRME",
  "TRANSMIS",
  "ATTENTE_REPONSE",
] as const;

export const ACCEPTED_DOSSIER_STATES: readonly EtatDossier[] = [
  "PRE_ADMISSION",
  "ATTESTATION",
  "CLOTURE",
] as const;

export const PIECE_STATUSES = {
  MANQUANTE: "manquante",
  TELEVERSEE: "televersee",
  A_CORRIGER: "a_corriger",
  VALIDEE: "validee",
} as const;

export type PieceStatus = (typeof PIECE_STATUSES)[keyof typeof PIECE_STATUSES];

export const PAYMENT_STATUSES = {
  AUCUN: "aucun",
  PARTIEL: "partiel",
  COMPLET: "complet",
} as const;

export const PAIEMENT_TRANSACTION_STATUSES = {
  EN_ATTENTE: "en_attente",
  REUSSI: "reussi",
  ECHOUE: "echoue",
  REMBOURSE: "rembourse",
} as const;

/** Ordre d’étape workflow (1–12) aligné sur Prisma EtatDossier. */
export const ETAPE_PAR_ETAT: Record<EtatDossier, number> = {
  BROUILLON: 1,
  SOUMIS: 2,
  VERIFICATION: 3,
  CORRECTION: 4,
  PAIEMENT_ATTENTE: 5,
  PAIEMENT_CONFIRME: 6,
  TRANSMIS: 7,
  ATTENTE_REPONSE: 8,
  PRE_ADMISSION: 9,
  REFUSE: 10,
  ATTESTATION: 11,
  CLOTURE: 12,
};

export function isDossierEditableByCandidate(etat: string): boolean {
  return (EDITABLE_DOSSIER_STATES as readonly string[]).includes(etat);
}

export function isClosedDossierState(etat: string): boolean {
  return (CLOSED_DOSSIER_STATES as readonly string[]).includes(etat);
}
