import type { EtatDossier } from "@prisma/client";
import { ETAPE_PAR_ETAT } from "@/shared/constants";

export { ETAPE_PAR_ETAT };

export type WorkflowPermission =
  | "dossiers.write"
  | "dossiers.transmettre"
  | "attestations.emit"
  | "finance.write";

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
  confirmer_paiement: {
    from: ["PAIEMENT_ATTENTE"],
    to: "PAIEMENT_CONFIRME",
    permission: "finance.write",
  },
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
  emettre_attestation: {
    from: ["PRE_ADMISSION"],
    to: "ATTESTATION",
    permission: "attestations.emit",
  },
  cloturer: {
    from: ["ATTESTATION", "REFUSE"],
    to: "CLOTURE",
    permission: "dossiers.write",
  },
};

export function getEtapeForEtat(etat: EtatDossier): number {
  return ETAPE_PAR_ETAT[etat];
}
