import {
  buildPiecesDossier,
  buildPiecesRequises,
  isProfilAcademiqueComplet,
  listPiecesManquantes,
  mergePiecesFormation,
} from "@/lib/dossier/pieces-requises";
import { resolveFraisAgence, resolveFraisRange } from "@/lib/dossier/frais-agence";
import { buildPiecesFromRegles } from "@/lib/dossier/matrice-engine";
import { MATRICE_V1_REGLES } from "@/lib/dossier/matrice-v1-regles";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function codesOf(pieces: { code: string }[]) {
  return pieces
    .map((p) => p.code)
    .sort()
    .join("|");
}

// Frais (defaults / cache vide)
assert(resolveFraisAgence("PUBLIC") === 65_000, "PUBLIC = 65000");
assert(resolveFraisAgence("PRIVE") === 110_000, "PRIVE = 110000");
assert(resolveFraisAgence(undefined) === 110_000, "default PRIVE");
assert(resolveFraisRange("PUBLIC").fraisMin === 65_000, "range PUBLIC");
assert(resolveFraisRange("PRIVE").fraisMax === 110_000, "range PRIVE");
assert(
  resolveFraisAgence("PUBLIC", { public: 70_000, prive: 120_000 }) === 70_000,
  "config override PUBLIC",
);

// Lycéen sans bac
const lyceeProfil = {
  statutCandidat: "LYCEEN" as const,
  classeActuelle: "TERMINALE",
  aObtenuBac: false,
  trimestresSeconde: 3,
  trimestresPremiere: 2,
  trimestresTerminale: 2,
};
const lycee = buildPiecesRequises(lyceeProfil);
assert(lycee.some((p) => p.code === "BULLETIN_SECONDE_T3"), "Seconde T3");
assert(lycee.some((p) => p.code === "BULLETIN_PREMIERE_T2"), "Première T2");
assert(lycee.find((p) => p.code === "DIPLOME_BAC")?.obligatoire === false, "Bac optionnel lycéen");
assert(lycee.some((p) => p.code === "IDENTITE_PHOTO"), "Photo identité");

// Matrice v1 seed == fallback hardcodé
const lyceeMatrice = buildPiecesFromRegles(lyceeProfil, MATRICE_V1_REGLES);
assert(codesOf(lycee) === codesOf(lyceeMatrice), "matrice v1 ≈ hardcodé lycéen");
assert(lyceeMatrice.some((p) => p.code === "BULLETIN_SECONDE_T3"), "matrice Seconde T3");

// Lycéen + bac obtenu
const lyceeBac = buildPiecesRequises({
  statutCandidat: "LYCEEN",
  classeActuelle: "TERMINALE",
  aObtenuBac: true,
  trimestresSeconde: 3,
  trimestresPremiere: 3,
  trimestresTerminale: 3,
});
assert(lyceeBac.find((p) => p.code === "DIPLOME_BAC")?.obligatoire === true, "Bac obligatoire si obtenu");
assert(lyceeBac.find((p) => p.code === "RELEVE_BAC")?.obligatoire === true, "Relevé bac obligatoire");

// Redoublement Terminale + interruption emploi
const lyceeRedProfil = {
  statutCandidat: "LYCEEN" as const,
  classeActuelle: "TERMINALE",
  aObtenuBac: false,
  trimestresSeconde: 3,
  trimestresPremiere: 3,
  trimestresTerminale: 2,
  redoublements: [{ niveau: "TERMINALE", anneeScolaire: "2023-2024" }],
  interruptions: [{ type: "emploi", anneeDebut: "2022", anneeFin: "2023" }],
};
const lyceeRed = buildPiecesRequises(lyceeRedProfil);
assert(lyceeRed.some((p) => p.code.startsWith("RED_TERMINALE")), "Redoublement Terminale");
assert(lyceeRed.some((p) => p.code.startsWith("JUSTIF_EMPLOI")), "Justificatif emploi");
assert(
  codesOf(lyceeRed) === codesOf(buildPiecesFromRegles(lyceeRedProfil, MATRICE_V1_REGLES)),
  "matrice v1 ≈ hardcodé redoublement/interruption",
);

// Bachelier L2 + interruption
const bachProfil = {
  statutCandidat: "BACHELIER" as const,
  niveauEtudesSuperieures: "L2" as const,
  formationEnCours: true,
  diplomesObtenus: ["DUT"],
  redoublements: [{ niveau: "L1", anneeScolaire: "2022-2023" }],
  interruptions: [{ type: "stage", anneeDebut: "2021", anneeFin: "2022" }],
};
const bach = buildPiecesRequises(bachProfil);
assert(bach.find((p) => p.code === "DIPLOME_BAC")?.obligatoire === true, "Bac obligatoire");
assert(bach.some((p) => p.code === "RELEVE_L1"), "L1");
assert(bach.some((p) => p.code === "RELEVE_L2"), "L2");
assert(!bach.some((p) => p.code.startsWith("BULLETIN_SECONDE")), "Pas de bulletins lycée bachelier");
assert(bach.some((p) => p.code === "CERTIFICAT_SCOLARITE_SUP"), "Certificat scolarité");
assert(bach.some((p) => p.code.startsWith("DIPLOME_DUT")), "Diplôme DUT");
assert(bach.some((p) => p.code.startsWith("RED_L1")), "Redoublement");
assert(bach.some((p) => p.code.startsWith("JUSTIF_STAGE")), "Justificatif stage");
assert(
  codesOf(bach) === codesOf(buildPiecesFromRegles(bachProfil, MATRICE_V1_REGLES)),
  "matrice v1 ≈ hardcodé bachelier L2",
);

// Merge formation
const merged = mergePiecesFormation(lycee, ["CV", "Lettre de motivation", "Test de français (TCF/DELF)"]);
assert(merged.some((p) => p.code === "FORM_CV"), "FORM_CV");
assert(merged.some((p) => p.code.startsWith("FORM_LETTRE")), "FORM lettre");
assert(merged.find((p) => p.code === "FORM_CV")?.categorie === "complementaire", "catégorie complémentaire");
assert(merged.find((p) => p.code === "FORM_CV")?.obligatoire === true, "FORM obligatoire");

const dossierPieces = buildPiecesDossier(
  {
    statutCandidat: "BACHELIER",
    niveauEtudesSuperieures: "AUCUN",
  },
  ["Portfolio"],
);
assert(dossierPieces.some((p) => p.code === "FORM_PORTFOLIO"), "buildPiecesDossier merge");

// Profil complet
assert(
  isProfilAcademiqueComplet({
    statutCandidat: "LYCEEN",
    classeActuelle: "TERMINALE",
    trimestresSeconde: 3,
    trimestresPremiere: 3,
    trimestresTerminale: 2,
  }),
  "lycéen complet",
);
assert(
  !isProfilAcademiqueComplet({
    statutCandidat: "LYCEEN",
    classeActuelle: "",
    trimestresSeconde: 3,
    trimestresPremiere: 3,
    trimestresTerminale: 2,
  }),
  "lycéen sans classe",
);
assert(
  isProfilAcademiqueComplet({
    statutCandidat: "BACHELIER",
    niveauEtudesSuperieures: "AUCUN",
  }),
  "bachelier bac seul",
);

// listPiecesManquantes
const missing = listPiecesManquantes([
  { libelle: "A", obligatoire: true, statut: "televersee", cheminFichier: "/a.pdf" },
  { libelle: "B", obligatoire: true, statut: "televersee", cheminFichier: null },
  { libelle: "C", obligatoire: false, statut: "manquante", cheminFichier: null },
  { libelle: "D", obligatoire: true, statut: "manquante", cheminFichier: null },
]);
assert(missing.length === 2, "2 manquantes (B sans fichier + D)");
assert(missing.map((m) => m.libelle).join(",") === "B,D", "libellés manquants");

console.log("OK pieces-requises + matrice-v1 + frais-agence");
