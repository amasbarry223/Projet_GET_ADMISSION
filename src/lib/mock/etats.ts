// Les 12 états du dossier (ordre réel du workflow)
export type EtatCode =
  | "brouillon"
  | "soumis"
  | "verification"
  | "correction"
  | "paiement_attente"
  | "paiement_confirme"
  | "transmis"
  | "attente_reponse"
  | "pre_admission"
  | "refuse"
  | "attestation"
  | "cloture";

export type Etat = {
  code: EtatCode;
  ordre: number; // 1..12
  libelle: string;
  description: string;
  categorie: "brouillon" | "attente" | "valide" | "refuse";
  couleur: "ardoise" | "ambre" | "vert" | "carmin";
};

export const ETATS: Etat[] = [
  { code: "brouillon", ordre: 1, libelle: "Brouillon", description: "Dossier en cours de constitution par le candidat.", categorie: "brouillon", couleur: "ardoise" },
  { code: "soumis", ordre: 2, libelle: "Soumis", description: "Dossier transmis à l'agence, en attente de prise en charge.", categorie: "attente", couleur: "ambre" },
  { code: "verification", ordre: 3, libelle: "En vérification", description: "Le conseiller vérifie l'éligibilité et la complétude.", categorie: "attente", couleur: "ambre" },
  { code: "correction", ordre: 4, libelle: "À corriger", description: "Des pièces ou informations doivent être corrigées.", categorie: "attente", couleur: "ambre" },
  { code: "paiement_attente", ordre: 5, libelle: "Paiement en attente", description: "Les frais d'agence doivent être réglés pour poursuivre.", categorie: "attente", couleur: "ambre" },
  { code: "paiement_confirme", ordre: 6, libelle: "Paiement confirmé", description: "Frais d'agence reçus, dossier prêt à être transmis.", categorie: "valide", couleur: "vert" },
  { code: "transmis", ordre: 7, libelle: "Transmis à l'université", description: "Dossier envoyé à l'université partenaire.", categorie: "attente", couleur: "ambre" },
  { code: "attente_reponse", ordre: 8, libelle: "En attente de réponse", description: "L'université examine le dossier.", categorie: "attente", couleur: "ambre" },
  { code: "pre_admission", ordre: 9, libelle: "Pré-admission accordée", description: "L'université a accordé la pré-admission.", categorie: "valide", couleur: "vert" },
  { code: "refuse", ordre: 10, libelle: "Refusé", description: "L'université a décliné la candidature.", categorie: "refuse", couleur: "carmin" },
  { code: "attestation", ordre: 11, libelle: "Attestation disponible", description: "L'attestation de pré-inscription est prête.", categorie: "valide", couleur: "vert" },
  { code: "cloture", ordre: 12, libelle: "Clôturé", description: "Dossier entièrement traité et archivé.", categorie: "valide", couleur: "vert" },
];

export function etatParCode(code: EtatCode | string): Etat {
  const normalized = code.toLowerCase() as EtatCode;
  return ETATS.find((e) => e.code === normalized) ?? ETATS[0];
}
export function etatParOrdre(ordre: number): Etat {
  return ETATS.find((e) => e.ordre === ordre)!;
}

export const COULEUR_BADGE: Record<Etat["couleur"], { text: string; border: string; bg: string }> = {
  ardoise: { text: "text-ardoise", border: "border-ardoise", bg: "bg-ardoise/5" },
  ambre: { text: "text-ambre", border: "border-ambre", bg: "bg-ambre/5" },
  vert: { text: "text-vert", border: "border-vert", bg: "bg-vert/5" },
  carmin: { text: "text-carmin", border: "border-carmin", bg: "bg-carmin/5" },
};
