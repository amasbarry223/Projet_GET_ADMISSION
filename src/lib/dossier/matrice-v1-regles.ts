/**
 * Règles seed de la matrice documentaire v1 — miroir du comportement historique.
 */
export type SeedRegle = {
  code: string;
  libelle: string;
  categorie: string;
  obligatoire: boolean;
  condition:
    | "TOUJOURS"
    | "LYCEEN"
    | "BACHELIER"
    | "BAC_OBTENU"
    | "BAC_OPTIONNEL_LYCEEN"
    | "NIVEAU_SUP_MIN"
    | "FORMATION_EN_COURS"
    | "ATTESTATION_SCOLARITE"
    | "REDOUBLEMENT"
    | "INTERRUPTION"
    | "IDENTITE"
    | "BULLETINS_LYCEE";
  niveauMin?: string | null;
  meta?: string;
  ordre: number;
};

export const MATRICE_V1_REGLES: SeedRegle[] = [
  {
    code: "BULLETINS_SECONDE",
    libelle: "Bulletins scolaires — Seconde (10ᵉ année)",
    categorie: "academique",
    obligatoire: true,
    condition: "BULLETINS_LYCEE",
    meta: JSON.stringify({ classe: "SECONDE", prefix: "BULLETIN_SECONDE", label: "Seconde (10ᵉ année)" }),
    ordre: 10,
  },
  {
    code: "BULLETINS_PREMIERE",
    libelle: "Bulletins scolaires — Première (11ᵉ année)",
    categorie: "academique",
    obligatoire: true,
    condition: "BULLETINS_LYCEE",
    meta: JSON.stringify({ classe: "PREMIERE", prefix: "BULLETIN_PREMIERE", label: "Première (11ᵉ année)" }),
    ordre: 20,
  },
  {
    code: "BULLETINS_TERMINALE",
    libelle: "Bulletins scolaires — Terminale (12ᵉ année)",
    categorie: "academique",
    obligatoire: true,
    condition: "BULLETINS_LYCEE",
    meta: JSON.stringify({ classe: "TERMINALE", prefix: "BULLETIN_TERMINALE", label: "Terminale (12ᵉ année)" }),
    ordre: 30,
  },
  {
    code: "ATTESTATION_SCOLARITE",
    libelle: "Attestation de scolarité (si disponible)",
    categorie: "complementaire",
    obligatoire: false,
    condition: "ATTESTATION_SCOLARITE",
    ordre: 40,
  },
  {
    code: "DIPLOME_BAC",
    libelle: "Diplôme du baccalauréat (ou attestation de réussite)",
    categorie: "academique",
    obligatoire: true,
    condition: "BAC_OBTENU",
    ordre: 50,
  },
  {
    code: "RELEVE_BAC",
    libelle: "Relevé officiel des notes du baccalauréat",
    categorie: "academique",
    obligatoire: true,
    condition: "BAC_OBTENU",
    ordre: 51,
  },
  {
    code: "DIPLOME_BAC_OPT",
    libelle: "Diplôme du baccalauréat (ou attestation de réussite)",
    categorie: "academique",
    obligatoire: false,
    condition: "BAC_OPTIONNEL_LYCEEN",
    meta: JSON.stringify({ pieceCode: "DIPLOME_BAC" }),
    ordre: 52,
  },
  {
    code: "RELEVE_BAC_OPT",
    libelle: "Relevé officiel des notes du baccalauréat",
    categorie: "academique",
    obligatoire: false,
    condition: "BAC_OPTIONNEL_LYCEEN",
    meta: JSON.stringify({ pieceCode: "RELEVE_BAC" }),
    ordre: 53,
  },
  {
    code: "RELEVE_L1",
    libelle: "Bulletins / relevés de notes — 1ʳᵉ année universitaire (L1)",
    categorie: "academique",
    obligatoire: true,
    condition: "NIVEAU_SUP_MIN",
    niveauMin: "L1",
    ordre: 60,
  },
  {
    code: "RELEVE_L2",
    libelle: "Bulletins / relevés de notes — 2ᵉ année universitaire (L2)",
    categorie: "academique",
    obligatoire: true,
    condition: "NIVEAU_SUP_MIN",
    niveauMin: "L2",
    ordre: 61,
  },
  {
    code: "RELEVE_L3",
    libelle: "Bulletins / relevés de notes — 3ᵉ année universitaire (L3)",
    categorie: "academique",
    obligatoire: true,
    condition: "NIVEAU_SUP_MIN",
    niveauMin: "L3",
    ordre: 62,
  },
  {
    code: "RELEVE_DUT_BTS",
    libelle: "Relevés de notes — DUT / BTS",
    categorie: "academique",
    obligatoire: true,
    condition: "NIVEAU_SUP_MIN",
    niveauMin: "DUT_BTS",
    ordre: 63,
  },
  {
    code: "RELEVE_MASTER",
    libelle: "Relevés de notes — Master / études post-licence",
    categorie: "academique",
    obligatoire: true,
    condition: "NIVEAU_SUP_MIN",
    niveauMin: "MASTER_PLUS",
    ordre: 64,
  },
  {
    code: "CERTIFICAT_SCOLARITE_SUP",
    libelle: "Certificat de fréquentation / scolarité (formation en cours)",
    categorie: "academique",
    obligatoire: true,
    condition: "FORMATION_EN_COURS",
    ordre: 70,
  },
  {
    code: "DIPLOMES_OBTENUS",
    libelle: "Diplômes obtenus (slots dynamiques)",
    categorie: "academique",
    obligatoire: true,
    condition: "BACHELIER",
    meta: JSON.stringify({ generative: "diplomes" }),
    ordre: 75,
  },
  {
    code: "REDOUBLEMENTS",
    libelle: "Bulletins / relevés des années redoublées",
    categorie: "academique",
    obligatoire: true,
    condition: "REDOUBLEMENT",
    ordre: 80,
  },
  {
    code: "INTERRUPTIONS",
    libelle: "Justificatifs d'interruption de parcours",
    categorie: "justificatif",
    obligatoire: true,
    condition: "INTERRUPTION",
    ordre: 90,
  },
];
