/**
 * Catalogue unifié PSTM + Galileo — source de vérité pour seed-catalogue-formations.
 * BTS / Bachelor → niveau Licence ; Master → Master.
 */

export type FormationCanonique = {
  intitule: string;
  niveau: "Licence" | "Master" | "Doctorat";
  domaine: string;
  duree: string;
  prerequis: string[];
  piecesRequises: string[];
};

const PREREQUIS_BTS = ["Bac ou équivalent", "Dossier complet"];
const PREREQUIS_BACHELOR = ["Bac ou équivalent", "Dossier complet"];
const PREREQUIS_MASTER = ["Licence ou équivalent Bac+3", "Dossier complet"];
const PREREQUIS_GENERAL = ["Bac ou équivalent", "Dossier complet"];

// "Passeport" retiré : la vérification d'identité (passeport / CNI) est
// entièrement gérée par le module KYC du profil candidat — inutile de le
// redemander ici (cf. pieces-requises.ts : seule IDENTITE_PHOTO subsiste).
const PIECES = [
  "Diplôme",
  "Relevé de notes",
  "CV",
  "Lettre de motivation",
];

function bts(intitule: string, domaine: string): FormationCanonique {
  return {
    intitule,
    niveau: "Licence",
    domaine,
    duree: "2 ans",
    prerequis: PREREQUIS_BTS,
    piecesRequises: PIECES,
  };
}

function bachelor(intitule: string, domaine: string): FormationCanonique {
  return {
    intitule,
    niveau: "Licence",
    domaine,
    duree: "3 ans",
    prerequis: PREREQUIS_BACHELOR,
    piecesRequises: PIECES,
  };
}

function master(intitule: string, domaine: string): FormationCanonique {
  return {
    intitule,
    niveau: "Master",
    domaine,
    duree: "2 ans",
    prerequis: PREREQUIS_MASTER,
    piecesRequises: PIECES,
  };
}

function galileo(intitule: string, domaine: string, duree = "3 ans"): FormationCanonique {
  return {
    intitule,
    niveau: "Licence",
    domaine,
    duree,
    prerequis: PREREQUIS_GENERAL,
    piecesRequises: PIECES,
  };
}

/** Liste fusionnée PSTM + Galileo (21 intitulés uniques). */
export const FORMATIONS_CANONIQUES: FormationCanonique[] = [
  // —— PSTM ——
  bts("BTS comptabilité et gestion", "Comptabilité"),
  bts("BTS bâtiment", "Bâtiment"),
  bts("BTS services informatiques aux organisations", "Informatique"),
  bts("BTS commerce international", "Commerce"),
  bts("BTS professions immobilières", "Immobilier"),
  bts("BTS négociation et digitalisation de la relation client", "Commerce"),
  bachelor("Bachelor marketing et développement commercial", "Marketing"),
  bachelor("Bachelor en informatique et technologie numérique", "Informatique"),
  bachelor("Bachelor en responsable marketing et produit", "Marketing"),
  master("Master développement commercial", "Commerce"),
  master("Master management de projets innovants et transversaux", "Management"),
  // —— Galileo Global Education ——
  galileo("Informatique", "Informatique"),
  galileo("Comptabilité et gestion", "Comptabilité"),
  galileo("Audit et contrôle de gestion", "Audit"),
  galileo("Finance", "Finance"),
  galileo("Gestion des entreprises", "Gestion"),
  galileo("Ressources humaines", "RH"),
  galileo("Droit", "Droit"),
  galileo("Marketing", "Marketing"),
  galileo("Logistique et transport", "Logistique"),
  galileo("Autre à préciser", "Autre", "À préciser"),
];
