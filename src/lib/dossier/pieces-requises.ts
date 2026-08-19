import { parseJsonArray } from "@/lib/parse-json";
import { buildPiecesFromRegles } from "@/lib/dossier/matrice-engine";
import {
  TRIMESTRES_DEFAULT_PREMIERE,
  TRIMESTRES_DEFAULT_SECONDE,
  TRIMESTRES_DEFAULT_TERMINALE,
  TRIMESTRES_MAX,
  TRIMESTRES_MIN,
} from "@/shared/constants";

export type StatutCandidatInput = "LYCEEN" | "BACHELIER";
export type NiveauSuperieurInput =
  | "AUCUN"
  | "L1"
  | "L2"
  | "L3"
  | "DUT_BTS"
  | "MASTER_PLUS";

const NIVEAU_SUPERIEUR_ORDER: NiveauSuperieurInput[] = [
  "L1",
  "L2",
  "L3",
  "DUT_BTS",
  "MASTER_PLUS",
];

function requiresLicence1Transcripts(niveauIndex: number): boolean {
  return niveauIndex >= 0;
}

function requiresLicence2Transcripts(niveauIndex: number): boolean {
  return niveauIndex >= 1;
}

function requiresLicence3Transcripts(niveauIndex: number): boolean {
  return niveauIndex >= 2;
}

function requiresDutBtsTranscripts(
  niveau: NiveauSuperieurInput,
  niveauIndex: number,
): boolean {
  return niveau === "DUT_BTS" || niveauIndex >= 3;
}

function requiresMasterTranscripts(niveau: NiveauSuperieurInput): boolean {
  return niveau === "MASTER_PLUS";
}

export type RedoublementInput = {
  niveau: string;
  anneeScolaire: string;
};

export type InterruptionInput = {
  type: "stage" | "emploi" | "formation" | "volontariat" | "lettre" | "autre";
  anneeDebut: string;
  anneeFin: string;
  libelle?: string;
};

export type ProfilAcademiqueInput = {
  statutCandidat: StatutCandidatInput;
  classeActuelle?: string | null;
  aObtenuBac?: boolean;
  trimestresSeconde?: number;
  trimestresPremiere?: number;
  trimestresTerminale?: number;
  attestationScolariteDisponible?: boolean;
  niveauEtudesSuperieures?: NiveauSuperieurInput | null;
  formationEnCours?: boolean;
  diplomesObtenus?: string[] | string;
  redoublements?: RedoublementInput[] | string;
  interruptions?: InterruptionInput[] | string;
};

export type PieceCategorie = "academique" | "identite" | "justificatif" | "complementaire";

export type PieceRequise = {
  code: string;
  libelle: string;
  categorie: PieceCategorie;
  obligatoire: boolean;
};

function clampTrimestres(n: number | undefined, fallback: number): number {
  if (typeof n !== "number" || Number.isNaN(n)) return fallback;
  return Math.min(TRIMESTRES_MAX, Math.max(TRIMESTRES_MIN, Math.round(n)));
}

function parseDiplomes(value: string[] | string | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return parseJsonArray(value);
}

function parseRedoublements(value: RedoublementInput[] | string | undefined): RedoublementInput[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseInterruptions(value: InterruptionInput[] | string | undefined): InterruptionInput[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function pushUnique(list: PieceRequise[], piece: PieceRequise) {
  if (list.some((p) => p.code === piece.code)) return;
  list.push(piece);
}

function bulletinsClasse(
  list: PieceRequise[],
  prefix: string,
  labelClasse: string,
  trimestres: number,
  obligatoire = true
) {
  for (let trimestreNumber = 1; trimestreNumber <= trimestres; trimestreNumber++) {
    pushUnique(list, {
      code: `${prefix}_T${trimestreNumber}`,
      libelle: `Bulletin scolaire — ${labelClasse} — Trimestre ${trimestreNumber}`,
      categorie: "academique",
      obligatoire,
    });
  }
}

const JUSTIF_LABELS: Record<InterruptionInput["type"], string> = {
  stage: "Attestation de stage",
  emploi: "Attestation d'emploi",
  formation: "Attestation de formation",
  volontariat: "Certificat de volontariat",
  lettre: "Lettre explicative (interruption d'études)",
  autre: "Justificatif officiel d'interruption",
};

const NIVEAU_LABEL: Record<string, string> = {
  SECONDE: "Seconde (redoublement)",
  PREMIERE: "Première (redoublement)",
  TERMINALE: "Terminale (redoublement)",
  L1: "Licence 1 (redoublement)",
  L2: "Licence 2 (redoublement)",
  L3: "Licence 3 (redoublement)",
  DUT_BTS: "DUT/BTS (redoublement)",
  MASTER: "Master (redoublement)",
};

function piecesBac(list: PieceRequise[], obligatoire: boolean) {
  pushUnique(list, {
    code: "DIPLOME_BAC",
    libelle: "Diplôme du baccalauréat (ou attestation de réussite)",
    categorie: "academique",
    obligatoire,
  });
  pushUnique(list, {
    code: "RELEVE_BAC",
    libelle: "Relevé officiel des notes du baccalauréat",
    categorie: "academique",
    obligatoire,
  });
}

function piecesSuperieur(
  list: PieceRequise[],
  niveau: NiveauSuperieurInput,
  formationEnCours: boolean,
  diplomes: string[]
) {
  const niveauIndex = NIVEAU_SUPERIEUR_ORDER.indexOf(niveau);

  if (requiresLicence1Transcripts(niveauIndex)) {
    pushUnique(list, {
      code: "RELEVE_L1",
      libelle: "Bulletins / relevés de notes — 1ʳᵉ année universitaire (L1)",
      categorie: "academique",
      obligatoire: true,
    });
  }
  if (requiresLicence2Transcripts(niveauIndex)) {
    pushUnique(list, {
      code: "RELEVE_L2",
      libelle: "Bulletins / relevés de notes — 2ᵉ année universitaire (L2)",
      categorie: "academique",
      obligatoire: true,
    });
  }
  if (requiresLicence3Transcripts(niveauIndex)) {
    pushUnique(list, {
      code: "RELEVE_L3",
      libelle: "Bulletins / relevés de notes — 3ᵉ année universitaire (L3)",
      categorie: "academique",
      obligatoire: true,
    });
  }
  if (requiresDutBtsTranscripts(niveau, niveauIndex)) {
    pushUnique(list, {
      code: "RELEVE_DUT_BTS",
      libelle: "Relevés de notes — DUT / BTS",
      categorie: "academique",
      obligatoire: true,
    });
  }
  if (requiresMasterTranscripts(niveau)) {
    pushUnique(list, {
      code: "RELEVE_MASTER",
      libelle: "Relevés de notes — Master / études post-licence",
      categorie: "academique",
      obligatoire: true,
    });
  }

  for (const dip of diplomes) {
    const slug = dip
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 40);
    pushUnique(list, {
      code: `DIPLOME_${slug || "AUTRE"}`,
      libelle: `Diplôme obtenu — ${dip}`,
      categorie: "academique",
      obligatoire: true,
    });
  }

  if (formationEnCours) {
    pushUnique(list, {
      code: "CERTIFICAT_SCOLARITE_SUP",
      libelle: "Certificat de fréquentation / scolarité (formation en cours)",
      categorie: "academique",
      obligatoire: true,
    });
  }
}

function slugifyCode(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
}

/**
 * Génère la liste dynamique des pièces selon le profil (fallback hardcodé).
 * Préférer `buildPiecesRequisesAsync` côté serveur pour utiliser la matrice ACTIVE.
 */
export function buildPiecesRequises(profil: ProfilAcademiqueInput): PieceRequise[] {
  const list: PieceRequise[] = [];

  const tSeconde = clampTrimestres(profil.trimestresSeconde, TRIMESTRES_DEFAULT_SECONDE);
  const tPremiere = clampTrimestres(profil.trimestresPremiere, TRIMESTRES_DEFAULT_PREMIERE);
  const tTerminale = clampTrimestres(profil.trimestresTerminale, TRIMESTRES_DEFAULT_TERMINALE);
  const redoublements = parseRedoublements(profil.redoublements);
  const interruptions = parseInterruptions(profil.interruptions);
  const diplomes = parseDiplomes(profil.diplomesObtenus);

  if (profil.statutCandidat === "LYCEEN") {
    bulletinsClasse(list, "BULLETIN_SECONDE", "Seconde (10ᵉ année)", tSeconde);
    bulletinsClasse(list, "BULLETIN_PREMIERE", "Première (11ᵉ année)", tPremiere);
    bulletinsClasse(list, "BULLETIN_TERMINALE", "Terminale (12ᵉ année)", tTerminale);

    pushUnique(list, {
      code: "ATTESTATION_SCOLARITE",
      libelle: profil.attestationScolariteDisponible
        ? "Attestation de scolarité"
        : "Attestation de scolarité (si disponible)",
      categorie: "complementaire",
      obligatoire: false,
    });

    // Bac : obligatoire seulement s'il l'a déjà obtenu ; sinon optionnel (ajout ultérieur)
    piecesBac(list, Boolean(profil.aObtenuBac));
  } else {
    // BACHELIER — pas de bulletins lycée (hors redoublement déclaré)
    piecesBac(list, true);
    piecesSuperieur(
      list,
      profil.niveauEtudesSuperieures ?? "AUCUN",
      Boolean(profil.formationEnCours),
      diplomes
    );
  }

  // Redoublements
  redoublements.forEach((r, i) => {
    const niveau = (r.niveau || "AUTRE").toUpperCase();
    const label = NIVEAU_LABEL[niveau] ?? `Redoublement ${niveau}`;
    const annee = r.anneeScolaire ? ` (${r.anneeScolaire})` : "";
    const isLycee = ["SECONDE", "PREMIERE", "TERMINALE"].includes(niveau);
    pushUnique(list, {
      code: `RED_${niveau}_${i + 1}`,
      libelle: isLycee
        ? `Bulletins scolaires — ${label}${annee}`
        : `Relevés de notes — ${label}${annee}`,
      categorie: "academique",
      obligatoire: true,
    });
  });

  // Interruptions
  interruptions.forEach((it, i) => {
    const type = it.type || "autre";
    const base = JUSTIF_LABELS[type] ?? JUSTIF_LABELS.autre;
    const periode =
      it.anneeDebut || it.anneeFin
        ? ` — ${it.anneeDebut || "?"}${it.anneeFin ? ` → ${it.anneeFin}` : ""}`
        : "";
    const extra = it.libelle ? ` (${it.libelle})` : "";
    pushUnique(list, {
      code: `JUSTIF_${type.toUpperCase()}_${i + 1}`,
      libelle: `${base}${periode}${extra}`,
      categorie: "justificatif",
      obligatoire: true,
    });
  });

  // Identité (photo uniquement — le passeport/CNI est géré via le module KYC du profil)
  pushUnique(list, {
    code: "IDENTITE_PHOTO",
    libelle: "Photo d'identité récente",
    categorie: "identite",
    obligatoire: true,
  });

  return list;
}

/**
 * Fusionne les pièces catalogue formation (CV, TCF, portfolio…) en complémentaires obligatoires.
 * N'écrase jamais un code déjà généré par le profil.
 */
/**
 * Libellés de pièces formation qui correspondent à des pièces d'identité
 * déjà gérées exclusivement par le module KYC (passeport / CNI).
 * Ces entrées sont ignorées lors de la fusion pour éviter les doublons.
 */
const FORMATION_PIECES_KYC_FILTER = [
  "passeport",
  "passport",
  "cni",
  "carte nationale",
  "carte d'identite",
  "carte d'identité",
  "piece d'identite",
  "pièce d'identité",
  "identity",
];

function isKycPiece(label: string): boolean {
  const lower = label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return FORMATION_PIECES_KYC_FILTER.some((kw) => lower.includes(kw));
}

export function mergePiecesFormation(
  profilPieces: PieceRequise[],
  formationPiecesRequises: string[] | string | null | undefined
): PieceRequise[] {
  const list = [...profilPieces];
  const raw = Array.isArray(formationPiecesRequises)
    ? formationPiecesRequises
    : parseJsonArray(
        typeof formationPiecesRequises === "string" ? formationPiecesRequises : null
      );

  for (const label of raw) {
    const trimmed = String(label || "").trim();
    if (!trimmed) continue;
    // Ignorer les pièces d'identité : gérées exclusivement via le module KYC.
    if (isKycPiece(trimmed)) continue;
    const slug = slugifyCode(trimmed);
    const isLettreMotivation =
      trimmed.toLowerCase().includes("motivation") ||
      trimmed.toLowerCase().includes("lettre") ||
      slug.includes("MOTIVATION");
    pushUnique(list, {
      code: `FORM_${slug || "AUTRE"}`,
      libelle: trimmed,
      categorie: "complementaire",
      obligatoire: !isLettreMotivation,
    });
  }

  return list;
}

/** Profil + pièces formation → liste complète pour sync. */
export function buildPiecesDossier(
  profil: ProfilAcademiqueInput,
  formationPiecesRequises?: string[] | string | null
): PieceRequise[] {
  return mergePiecesFormation(buildPiecesRequises(profil), formationPiecesRequises);
}

/** Variante serveur : matrice ACTIVE si disponible, sinon fallback hardcodé. */
export async function buildPiecesRequisesAsync(
  profil: ProfilAcademiqueInput,
): Promise<PieceRequise[]> {
  // Import dynamique : évite de tirer Prisma dans les bundles client
  // (ex. wizard / admin matrice qui utilisent le fallback sync).
  const { loadActiveMatriceRegles } = await import("@/lib/dossier/matrice-loader");
  const regles = await loadActiveMatriceRegles();
  if (regles && regles.length > 0) {
    return buildPiecesFromRegles(profil, regles);
  }
  return buildPiecesRequises(profil);
}

export async function buildPiecesDossierAsync(
  profil: ProfilAcademiqueInput,
  formationPiecesRequises?: string[] | string | null,
): Promise<PieceRequise[]> {
  const base = await buildPiecesRequisesAsync(profil);
  return mergePiecesFormation(base, formationPiecesRequises);
}

function isTrimestresValid(n: number | undefined): boolean {
  if (typeof n !== "number" || Number.isNaN(n)) return true; // défaut schéma / formulaire
  return n >= TRIMESTRES_MIN && n <= TRIMESTRES_MAX;
}

/** Vérifie qu'un profil a le minimum requis pour créer un dossier. */
export function isProfilAcademiqueComplet(profil: ProfilAcademiqueInput | null | undefined): boolean {
  if (!profil?.statutCandidat) return false;

  if (profil.statutCandidat === "LYCEEN") {
    const classe = (profil.classeActuelle || "").trim();
    if (!classe) return false;
    return (
      isTrimestresValid(profil.trimestresSeconde) &&
      isTrimestresValid(profil.trimestresPremiere) &&
      isTrimestresValid(profil.trimestresTerminale)
    );
  }

  if (profil.statutCandidat === "BACHELIER") {
    const niveau = profil.niveauEtudesSuperieures ?? "AUCUN";
    const known: NiveauSuperieurInput[] = [
      "AUCUN",
      "L1",
      "L2",
      "L3",
      "DUT_BTS",
      "MASTER_PLUS",
    ];
    if (!known.includes(niveau)) return false;
    // AUCUN = bac seul OK ; niveaux supérieurs OK même sans diplômes listés
    return true;
  }

  return false;
}

export type PieceManquanteLike = {
  libelle: string;
  code?: string | null;
  categorie?: string | null;
  obligatoire?: boolean | null;
  statut?: string | null;
  cheminFichier?: string | null;
};

/**
 * Critère unique client/serveur : obligatoire + (pas de fichier OU statut manquante/à corriger).
 */
export function listPiecesManquantes<T extends PieceManquanteLike>(pieces: T[]): T[] {
  return pieces.filter((piece) => {
    if (piece.obligatoire === false) return false;
    const lib = (piece.libelle || "").toLowerCase();
    const code = (piece.code || "").toLowerCase();
    if (
      lib.includes("motivation") ||
      code.includes("motivation") ||
      code.includes("lettre_motivation") ||
      lib.includes("passeport") ||
      lib.includes("passport") ||
      lib.includes("cni") ||
      lib.includes("carte d'identité") ||
      lib.includes("carte nationale") ||
      code.includes("passeport") ||
      code.includes("passport") ||
      code.includes("cni")
    ) {
      return false;
    }
    const statut = piece.statut || "manquante";
    if (statut === "manquante" || statut === "a_corriger") return true;
    if (!piece.cheminFichier) return true;
    return false;
  });
}

/** Compteurs par catégorie pour l’aperçu wizard. */
export function countPiecesByCategorie(pieces: PieceRequise[]): Record<PieceCategorie, number> {
  const counts: Record<PieceCategorie, number> = {
    academique: 0,
    identite: 0,
    justificatif: 0,
    complementaire: 0,
  };
  for (const p of pieces) {
    counts[p.categorie] = (counts[p.categorie] ?? 0) + 1;
  }
  return counts;
}
