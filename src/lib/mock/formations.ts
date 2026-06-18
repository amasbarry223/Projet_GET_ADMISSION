import { UNIVERSITES, type Niveau } from "./universites";

export type Formation = {
  id: string;
  universiteId: string;
  intitule: string;
  niveau: Niveau;
  domaine: string;
  duree: string;
  fraisAgence: number; // FCFA
  prerequis: string[];
  piecesRequises: string[];
};

export const FORMATIONS: Formation[] = [
  // Sorbonne
  {
    id: "f-su-m1-droit",
    universiteId: "u-sorbonne",
    intitule: "Master Droit international et européen",
    niveau: "Master",
    domaine: "Droit",
    duree: "2 ans",
    fraisAgence: 850000,
    prerequis: ["Licence en droit", "Niveau B2 en français", "Lettre de motivation"],
    piecesRequises: ["Diplôme de licence", "Relevé de notes", "CV", "Lettre de motivation", "Test de français (TCF/DELF)"],
  },
  {
    id: "f-su-l3-sciences",
    universiteId: "u-sorbonne",
    intitule: "Licence Sciences de la matière",
    niveau: "Licence",
    domaine: "Sciences",
    duree: "1 an (L3)",
    fraisAgence: 720000,
    prerequis: ["Bac+2 scientifique", "Dossier académique solide"],
    piecesRequises: ["Diplôme Bac+2", "Relevé de notes", "CV", "Test de français"],
  },
  {
    id: "f-su-m2-lettres",
    universiteId: "u-sorbonne",
    intitule: "Master Lettres et civilisations",
    niveau: "Master",
    domaine: "Lettres",
    duree: "2 ans",
    fraisAgence: 920000,
    prerequis: ["Licence en lettres", "Niveau C1 en français"],
    piecesRequises: ["Diplôme de licence", "Relevé de notes", "Mémoire de recherche", "Lettre de motivation"],
  },
  // UdeM
  {
    id: "f-udem-m-ia",
    universiteId: "u-umontreal",
    intitule: "Maîtrise en informatique — Intelligence artificielle",
    niveau: "Master",
    domaine: "Informatique",
    duree: "2 ans",
    fraisAgence: 1450000,
    prerequis: ["Bac en informatique", "Test d'anglais (IELTS/TOEFL)", "Projet de recherche"],
    piecesRequises: ["Diplôme de bac", "Relevé de notes", "CV", "Lettre de motivation", "Test d'anglais"],
  },
  {
    id: "f-udem-m-management",
    universiteId: "u-umontreal",
    intitule: "Maîtrise en management international",
    niveau: "Master",
    domaine: "Management",
    duree: "1,5 an",
    fraisAgence: 1180000,
    prerequis: ["Bac+3 en gestion", "Test d'anglais"],
    piecesRequises: ["Diplôme de bac+3", "Relevé de notes", "CV", "Lettre de motivation"],
  },
  // Hasselt
  {
    id: "f-uh-m-transport",
    universiteId: "u-uhasselt",
    intitule: "Master Transportation Sciences",
    niveau: "Master",
    domaine: "Transport",
    duree: "2 ans",
    fraisAgence: 980000,
    prerequis: ["Bac+3 en sciences humaines ou techniques", "Test d'anglais"],
    piecesRequises: ["Diplôme de bac+3", "Relevé de notes", "CV", "Lettre de motivation", "Test d'anglais"],
  },
  {
    id: "f-uh-l3-economie",
    universiteId: "u-uhasselt",
    intitule: "Bachelor Applied Economics",
    niveau: "Licence",
    domaine: "Économie",
    duree: "3 ans",
    fraisAgence: 820000,
    prerequis: ["Baccalauréat économique", "Test d'anglais"],
    piecesRequises: ["Diplôme de bac", "Relevé de notes", "Test d'anglais"],
  },
  // UM5 Rabat
  {
    id: "f-um5-m-droit",
    universiteId: "u-um5",
    intitule: "Master Droit public comparé",
    niveau: "Master",
    domaine: "Droit",
    duree: "2 ans",
    fraisAgence: 540000,
    prerequis: ["Licence en droit", "Niveau B2 en français"],
    piecesRequises: ["Diplôme de licence", "Relevé de notes", "CV", "Lettre de motivation"],
  },
  {
    id: "f-um5-l3-scpo",
    universiteId: "u-um5",
    intitule: "Licence Sciences politiques",
    niveau: "Licence",
    domaine: "Sciences politiques",
    duree: "1 an (L3)",
    fraisAgence: 420000,
    prerequis: ["Bac+2 en sciences politiques ou droit"],
    piecesRequises: ["Diplôme Bac+2", "Relevé de notes", "CV"],
  },
  // UCT
  {
    id: "f-uct-m-commerce",
    universiteId: "u-uct",
    intitule: "Master Commerce (MBA track)",
    niveau: "Master",
    domaine: "Commerce",
    duree: "1 an",
    fraisAgence: 1620000,
    prerequis: ["Bac+3 + expérience professionnelle", "Test d'anglais (IELTS)"],
    piecesRequises: ["Diplôme de bac+3", "Relevé de notes", "CV", "Test d'anglais", "Lettre de motivation"],
  },
  {
    id: "f-uct-m-ingenierie",
    universiteId: "u-uct",
    intitule: "Master Ingénierie des données",
    niveau: "Master",
    domaine: "Ingénierie",
    duree: "2 ans",
    fraisAgence: 1480000,
    prerequis: ["Bac en ingénierie ou informatique", "Test d'anglais"],
    piecesRequises: ["Diplôme de bac", "Relevé de notes", "CV", "Test d'anglais"],
  },
  // UGB
  {
    id: "f-ugb-m-economie",
    universiteId: "u-ugb",
    intitule: "Master Économie appliquée",
    niveau: "Master",
    domaine: "Économie",
    duree: "2 ans",
    fraisAgence: 480000,
    prerequis: ["Licence en économie"],
    piecesRequises: ["Diplôme de licence", "Relevé de notes", "CV", "Lettre de motivation"],
  },
  {
    id: "f-ugb-l3-droit",
    universiteId: "u-ugb",
    intitule: "Licence Droit des affaires",
    niveau: "Licence",
    domaine: "Droit",
    duree: "1 an (L3)",
    fraisAgence: 360000,
    prerequis: ["Bac+2 en droit"],
    piecesRequises: ["Diplôme Bac+2", "Relevé de notes"],
  },
  // UTM
  {
    id: "f-utm-m-medecine",
    universiteId: "u-tunis",
    intitule: "Master Médecine spécialisée",
    niveau: "Master",
    domaine: "Médecine",
    duree: "3 ans",
    fraisAgence: 720000,
    prerequis: ["Doctorat en médecine", "Concours d'accès"],
    piecesRequises: ["Diplôme de doctorat en médecine", "Relevé de notes", "CV", "Lettre de recommandation"],
  },
  {
    id: "f-utm-l3-ingenierie",
    universiteId: "u-tunis",
    intitule: "Licence Ingénierie informatique",
    niveau: "Licence",
    domaine: "Ingénierie",
    duree: "1 an (L3)",
    fraisAgence: 540000,
    prerequis: ["Bac+2 scientifique"],
    piecesRequises: ["Diplôme Bac+2", "Relevé de notes", "CV"],
  },
  // Nantes
  {
    id: "f-nantes-m-staps",
    universiteId: "u-nantes",
    intitule: "Master STAPS — Management du sport",
    niveau: "Master",
    domaine: "STAPS",
    duree: "2 ans",
    fraisAgence: 780000,
    prerequis: ["Licence STAPS", "Niveau B2 en français"],
    piecesRequises: ["Diplôme de licence", "Relevé de notes", "CV", "Lettre de motivation"],
  },
  {
    id: "f-nantes-l3-droit",
    universiteId: "u-nantes",
    intitule: "Licence Droit général",
    niveau: "Licence",
    domaine: "Droit",
    duree: "1 an (L3)",
    fraisAgence: 620000,
    prerequis: ["Bac+2 en droit"],
    piecesRequises: ["Diplôme Bac+2", "Relevé de notes", "CV"],
  },
  // LAU
  {
    id: "f-lau-m-architecture",
    universiteId: "u-lau",
    intitule: "Master Architecture",
    niveau: "Master",
    domaine: "Architecture",
    duree: "2 ans",
    fraisAgence: 1750000,
    prerequis: ["Bac+3 en architecture", "Portfolio", "Test d'anglais"],
    piecesRequises: ["Diplôme de bac+3", "Portfolio", "CV", "Test d'anglais", "Lettre de motivation"],
  },
  {
    id: "f-lau-m-management",
    universiteId: "u-lau",
    intitule: "Master Management international",
    niveau: "Master",
    domaine: "Management",
    duree: "1,5 an",
    fraisAgence: 1520000,
    prerequis: ["Bac+3 en gestion", "Test d'anglais"],
    piecesRequises: ["Diplôme de bac+3", "Relevé de notes", "CV", "Test d'anglais"],
  },
  // Yaoundé
  {
    id: "f-uy1-l3-sciences",
    universiteId: "u-yaounde",
    intitule: "Licence Sciences biologiques",
    niveau: "Licence",
    domaine: "Sciences",
    duree: "1 an (L3)",
    fraisAgence: 320000,
    prerequis: ["Bac+2 scientifique"],
    piecesRequises: ["Diplôme Bac+2", "Relevé de notes"],
  },
  {
    id: "f-uy1-m-droit",
    universiteId: "u-yaounde",
    intitule: "Master Droit des affaires OHADA",
    niveau: "Master",
    domaine: "Droit",
    duree: "2 ans",
    fraisAgence: 480000,
    prerequis: ["Licence en droit"],
    piecesRequises: ["Diplôme de licence", "Relevé de notes", "CV", "Lettre de motivation"],
  },
];

export function formationsParUniversite(universiteId: string): Formation[] {
  return FORMATIONS.filter((f) => f.universiteId === universiteId);
}

export function formationParId(id: string): Formation | undefined {
  return FORMATIONS.find((f) => f.id === id);
}

export function nomUniversite(universiteId: string): string {
  return UNIVERSITES.find((u) => u.id === universiteId)?.nom ?? universiteId;
}
