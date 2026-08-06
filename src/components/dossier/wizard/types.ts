export type PieceState = "manquante" | "televersee" | "validee" | "a_corriger";

export type PieceRow = {
  id: string;
  libelle: string;
  statut: PieceState;
  code?: string | null;
  categorie?: string | null;
  obligatoire?: boolean;
  cheminFichier?: string | null;
};

export type Formation = {
  id: string;
  intitule: string;
  niveau: string;
  domaine: string;
  duree: string;
  fraisAgence: number;
  prerequis: string[] | string;
  piecesRequises: string[] | string;
};

export type Universite = {
  id: string;
  nom: string;
  ville: string;
  drapeau: string;
  pays: string;
  typeEtablissement?: "PUBLIC" | "PRIVE";
  domaines: string[];
  formations: Formation[];
};

export type DossierWizardData = {
  id: string;
  reference: string;
  etat: string;
  etapeActuelle: number;
  updatedAt?: string;
  fraisAgence: number;
  mrz: string;
  candidat: {
    prenom: string;
    nom: string;
    email: string;
    nationalite: string;
    telephone: string;
  };
  universite: { id: string; nom: string; typeEtablissement?: "PUBLIC" | "PRIVE" };
  formation: { id: string; intitule: string; niveau: string; fraisAgence: number };
  conseiller: { prenom: string; nom: string } | null;
  pieces: PieceRow[];
  demandesCorrection?: {
    id: string;
    motif: string;
    statut: "EN_ATTENTE" | "SOUMISE" | "VALIDEE" | "REMPLACEE";
    createdAt: string;
  }[];
};

export type PersonalInfo = {
  nom: string;
  prenom: string;
  naissance: string;
  nationalite: string;
  email: string;
  tel: string;
  adresse: string;
};

export const WIZARD_STEP_LABELS = [
  { n: 1, label: "Université & formation" },
  { n: 2, label: "Informations" },
  { n: 3, label: "Profil académique" },
  { n: 4, label: "Documents académiques" },
  { n: 5, label: "Pièces d'identité" },
  { n: 6, label: "Récapitulatif & soumission" },
] as const;

export function parseStringList(value: string[] | string | undefined | null): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function pieceGroupLabel(categorie: string | null | undefined): string {
  if (categorie === "justificatif") return "Justificatifs d'interruption";
  if (categorie === "complementaire") return "Documents complémentaires";
  if (categorie === "identite") return "Identité";
  return "Documents académiques";
}
