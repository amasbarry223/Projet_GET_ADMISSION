import type { EtatDossier } from "@prisma/client";
import { ETAPE_PAR_ETAT } from "@/shared/constants";

export { ETAPE_PAR_ETAT };

export type WorkflowPermission =
  | "dossiers.write"
  | "dossiers.transmettre"
  | "attestations.emit";

export type WorkflowTransition = {
  from: EtatDossier[];
  to: EtatDossier;
  permission?: WorkflowPermission;
};

/** Transitions autorisées : action → { from[], to, permission? } */
export const WORKFLOW_TRANSITIONS: Record<string, WorkflowTransition> = {
  demarrer_verification: {
    from: ["SOUMIS"],
    to: "VERIFICATION",
    permission: "dossiers.write",
  },
  valider_dossier: {
    from: ["VERIFICATION"],
    to: "PAIEMENT_ATTENTE",
    permission: "dossiers.write",
  },
  // Alias UI : SOUMIS démarre la vérif ; VERIFICATION valide
  verifier: {
    from: ["SOUMIS", "VERIFICATION"],
    to: "PAIEMENT_ATTENTE",
    permission: "dossiers.write",
  },
  correction: {
    from: ["SOUMIS", "VERIFICATION"],
    to: "CORRECTION",
    permission: "dossiers.write",
  },
  verifier_corrections: {
    from: ["CORRECTION"],
    to: "VERIFICATION",
    permission: "dossiers.write",
  },
  // confirmer_paiement (PAIEMENT_ATTENTE → PAIEMENT_CONFIRME) retiré : le staff ne confirme plus
  // manuellement un paiement en ligne — cette transition se fait désormais automatiquement dès
  // qu'un paiement passe à "reussi" (webhook PayTech, déclaration candidat vérifiable), via
  // applyPaiementReussiInTx (src/lib/dossier/paiement-effects.ts), qui va même directement jusqu'à
  // TRANSMIS sans repasser par cet état intermédiaire. Un encaissement hors ligne enregistré par le
  // staff (POST /api/admin/paiements) reste, lui, capable d'amener le dossier à PAIEMENT_CONFIRME —
  // ce n'est pas une "confirmation" mais l'enregistrement d'un encaissement physique constaté.
  transmettre: {
    from: ["PAIEMENT_CONFIRME"],
    to: "TRANSMIS",
    permission: "dossiers.transmettre",
  },
  attendre_reponse: {
    from: ["TRANSMIS"],
    to: "ATTENTE_REPONSE",
    permission: "dossiers.write",
  },
  accepter: {
    from: ["ATTENTE_REPONSE", "TRANSMIS"],
    to: "PRE_ADMISSION",
    permission: "dossiers.write",
  },
  refuser: {
    from: ["ATTENTE_REPONSE", "TRANSMIS"],
    to: "REFUSE",
    permission: "dossiers.write",
  },
  // emettre_attestation : retiré du workflow générique — l'émission se fait exclusivement via
  // l'upload du document de préinscription (POST /api/dossiers/[id]/attestation/upload), qui
  // gère lui-même la transition PRE_ADMISSION → ATTESTATION.
  cloturer: {
    from: ["ATTESTATION", "REFUSE"],
    to: "CLOTURE",
    permission: "dossiers.write",
  },
};

export function getEtapeForEtat(etat: EtatDossier): number {
  return ETAPE_PAR_ETAT[etat];
}
