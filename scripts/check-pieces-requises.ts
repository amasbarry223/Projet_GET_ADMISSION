import {
  buildPiecesDossier,
  buildPiecesRequises,
  isProfilAcademiqueComplet,
  listPiecesManquantes,
  mergePiecesFormation,
} from "@/lib/dossier/pieces-requises";
import { resolveFraisAgence, resolveFraisRange } from "@/lib/dossier/frais-agence";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

// Frais
assert(resolveFraisAgence("PUBLIC") === 65_000, "PUBLIC = 65000");
assert(resolveFraisAgence("PRIVE") === 110_000, "PRIVE = 110000");
assert(resolveFraisAgence(undefined) === 110_000, "default PRIVE");
assert(resolveFraisRange("PUBLIC").fraisMin === 65_000, "range PUBLIC");
assert(resolveFraisRange("PRIVE").fraisMax === 110_000, "range PRIVE");

// Lycéen sans bac
const lycee = buildPiecesRequises({
  statutCandidat: "LYCEEN",
  classeActuelle: "TERMINALE",
  aObtenuBac: false,
  trimestresSeconde: 3,
  trimestresPremiere: 2,
  trimestresTerminale: 2,
});
assert(lycee.some((p) => p.code === "BULLETIN_SECONDE_T3"), "Seconde T3");
assert(lycee.some((p) => p.code === "BULLETIN_PREMIERE_T2"), "Première T2");
assert(lycee.find((p) => p.code === "DIPLOME_BAC")?.obligatoire === false, "Bac optionnel lycéen");
assert(lycee.some((p) => p.code === "IDENTITE_PHOTO"), "Photo identité");

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
const lyceeRed = buildPiecesRequises({
  statutCandidat: "LYCEEN",
  classeActuelle: "TERMINALE",
  aObtenuBac: false,
  trimestresSeconde: 3,
  trimestresPremiere: 3,
  trimestresTerminale: 2,
  redoublements: [{ niveau: "TERMINALE", anneeScolaire: "2023-2024" }],
  interruptions: [{ type: "emploi", anneeDebut: "2022", anneeFin: "2023" }],
});
assert(lyceeRed.some((p) => p.code.startsWith("RED_TERMINALE")), "Redoublement Terminale");
assert(lyceeRed.some((p) => p.code.startsWith("JUSTIF_EMPLOI")), "Justificatif emploi");

// Bachelier L2 + interruption
const bach = buildPiecesRequises({
  statutCandidat: "BACHELIER",
  niveauEtudesSuperieures: "L2",
  formationEnCours: true,
  diplomesObtenus: ["DUT"],
  redoublements: [{ niveau: "L1", anneeScolaire: "2022-2023" }],
  interruptions: [{ type: "stage", anneeDebut: "2021", anneeFin: "2022" }],
});
assert(bach.find((p) => p.code === "DIPLOME_BAC")?.obligatoire === true, "Bac obligatoire");
assert(bach.some((p) => p.code === "RELEVE_L1"), "L1");
assert(bach.some((p) => p.code === "RELEVE_L2"), "L2");
assert(!bach.some((p) => p.code.startsWith("BULLETIN_SECONDE")), "Pas de bulletins lycée bachelier");
assert(bach.some((p) => p.code === "CERTIFICAT_SCOLARITE_SUP"), "Certificat scolarité");
assert(bach.some((p) => p.code.startsWith("DIPLOME_DUT")), "Diplôme DUT");
assert(bach.some((p) => p.code.startsWith("RED_L1")), "Redoublement");
assert(bach.some((p) => p.code.startsWith("JUSTIF_STAGE")), "Justificatif stage");

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

console.log("OK pieces-requises + frais-agence");
