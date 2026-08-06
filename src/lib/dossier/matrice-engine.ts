import type { PieceCategorie, PieceRequise, ProfilAcademiqueInput, NiveauSuperieurInput } from "@/lib/dossier/pieces-requises";
import {
  TRIMESTRES_DEFAULT_PREMIERE,
  TRIMESTRES_DEFAULT_SECONDE,
  TRIMESTRES_DEFAULT_TERMINALE,
  TRIMESTRES_MAX,
  TRIMESTRES_MIN,
} from "@/shared/constants";
import { parseJsonArray } from "@/lib/parse-json";

export type MatriceRegleInput = {
  code: string;
  libelle: string;
  categorie: string;
  obligatoire: boolean;
  condition: string;
  niveauMin?: string | null;
  meta?: string | null;
  ordre: number;
};

const NIVEAU_SUPERIEUR_ORDER: NiveauSuperieurInput[] = [
  "L1",
  "L2",
  "L3",
  "DUT_BTS",
  "MASTER_PLUS",
];

const JUSTIF_LABELS: Record<string, string> = {
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

function clampTrimestres(n: number | undefined, fallback: number): number {
  if (typeof n !== "number" || Number.isNaN(n)) return fallback;
  return Math.min(TRIMESTRES_MAX, Math.max(TRIMESTRES_MIN, Math.round(n)));
}

function parseMeta(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    return typeof v === "object" && v ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function parseDiplomes(value: string[] | string | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return parseJsonArray(value);
}

function parseList<T>(value: T[] | string | undefined): T[] {
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

function slugifyCode(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
}

function niveauIndexOf(niveau: NiveauSuperieurInput): number {
  return NIVEAU_SUPERIEUR_ORDER.indexOf(niveau);
}

function meetsNiveauMin(
  profilNiveau: NiveauSuperieurInput,
  niveauMin: string | null | undefined,
): boolean {
  if (!niveauMin) return false;
  if (profilNiveau === "AUCUN") return false;
  const need = niveauIndexOf(niveauMin as NiveauSuperieurInput);
  const have = niveauIndexOf(profilNiveau);
  if (need < 0 || have < 0) {
    return profilNiveau === niveauMin;
  }
  // DUT_BTS: exact or master+
  if (niveauMin === "DUT_BTS") {
    return profilNiveau === "DUT_BTS" || have >= 3;
  }
  if (niveauMin === "MASTER_PLUS") {
    return profilNiveau === "MASTER_PLUS";
  }
  return have >= need;
}

/**
 * Évalue les règles d'une matrice versionnée contre un profil.
 */
export function buildPiecesFromRegles(
  profil: ProfilAcademiqueInput,
  regles: MatriceRegleInput[],
): PieceRequise[] {
  const list: PieceRequise[] = [];
  const sorted = [...regles].sort((a, b) => a.ordre - b.ordre);
  const isLyceen = profil.statutCandidat === "LYCEEN";
  const isBachelier = profil.statutCandidat === "BACHELIER";
  const niveau = (profil.niveauEtudesSuperieures ?? "AUCUN") as NiveauSuperieurInput;
  const diplomes = parseDiplomes(profil.diplomesObtenus);
  const redoublements = parseList<{ niveau: string; anneeScolaire: string }>(profil.redoublements);
  const interruptions = parseList<{
    type: string;
    anneeDebut: string;
    anneeFin: string;
    libelle?: string;
  }>(profil.interruptions);

  const tSeconde = clampTrimestres(profil.trimestresSeconde, TRIMESTRES_DEFAULT_SECONDE);
  const tPremiere = clampTrimestres(profil.trimestresPremiere, TRIMESTRES_DEFAULT_PREMIERE);
  const tTerminale = clampTrimestres(profil.trimestresTerminale, TRIMESTRES_DEFAULT_TERMINALE);

  for (const rule of sorted) {
    const cat = (rule.categorie || "academique") as PieceCategorie;
    const meta = parseMeta(rule.meta);

    switch (rule.condition) {
      case "BULLETINS_LYCEE": {
        if (!isLyceen) break;
        const prefix = String(meta.prefix || rule.code);
        const label = String(meta.label || rule.libelle);
        const classe = String(meta.classe || "");
        const trimestres =
          classe === "SECONDE"
            ? tSeconde
            : classe === "PREMIERE"
              ? tPremiere
              : tTerminale;
        for (let t = 1; t <= trimestres; t++) {
          pushUnique(list, {
            code: `${prefix}_T${t}`,
            libelle: `Bulletin scolaire — ${label} — Trimestre ${t}`,
            categorie: "academique",
            obligatoire: rule.obligatoire,
          });
        }
        break;
      }
      case "ATTESTATION_SCOLARITE": {
        if (!isLyceen) break;
        pushUnique(list, {
          code: "ATTESTATION_SCOLARITE",
          libelle: profil.attestationScolariteDisponible
            ? "Attestation de scolarité"
            : rule.libelle,
          categorie: "complementaire",
          obligatoire: false,
        });
        break;
      }
      case "BAC_OBTENU": {
        // Bachelier : toujours ; lycéen : seulement si bac obtenu
        if (isBachelier || (isLyceen && profil.aObtenuBac)) {
          pushUnique(list, {
            code: rule.code,
            libelle: rule.libelle,
            categorie: cat,
            obligatoire: true,
          });
        }
        break;
      }
      case "BAC_OPTIONNEL_LYCEEN": {
        if (!isLyceen || profil.aObtenuBac) break;
        const pieceCode = String(meta.pieceCode || rule.code.replace(/_OPT$/, ""));
        pushUnique(list, {
          code: pieceCode,
          libelle: rule.libelle,
          categorie: cat,
          obligatoire: false,
        });
        break;
      }
      case "NIVEAU_SUP_MIN": {
        if (!isBachelier) break;
        if (!meetsNiveauMin(niveau, rule.niveauMin)) break;
        pushUnique(list, {
          code: rule.code,
          libelle: rule.libelle,
          categorie: cat,
          obligatoire: rule.obligatoire,
        });
        break;
      }
      case "FORMATION_EN_COURS": {
        if (!isBachelier || !profil.formationEnCours) break;
        pushUnique(list, {
          code: rule.code,
          libelle: rule.libelle,
          categorie: cat,
          obligatoire: rule.obligatoire,
        });
        break;
      }
      case "BACHELIER": {
        if (!isBachelier) break;
        if (meta.generative === "diplomes") {
          for (const dip of diplomes) {
            const slug = slugifyCode(dip);
            pushUnique(list, {
              code: `DIPLOME_${slug || "AUTRE"}`,
              libelle: `Diplôme obtenu — ${dip}`,
              categorie: "academique",
              obligatoire: true,
            });
          }
        } else {
          pushUnique(list, {
            code: rule.code,
            libelle: rule.libelle,
            categorie: cat,
            obligatoire: rule.obligatoire,
          });
        }
        break;
      }
      case "LYCEEN": {
        if (!isLyceen) break;
        pushUnique(list, {
          code: rule.code,
          libelle: rule.libelle,
          categorie: cat,
          obligatoire: rule.obligatoire,
        });
        break;
      }
      case "REDOUBLEMENT": {
        redoublements.forEach((r, i) => {
          const niveauR = (r.niveau || "AUTRE").toUpperCase();
          const label = NIVEAU_LABEL[niveauR] ?? `Redoublement ${niveauR}`;
          const annee = r.anneeScolaire ? ` (${r.anneeScolaire})` : "";
          const isLyceeNiv = ["SECONDE", "PREMIERE", "TERMINALE"].includes(niveauR);
          pushUnique(list, {
            code: `RED_${niveauR}_${i + 1}`,
            libelle: isLyceeNiv
              ? `Bulletins scolaires — ${label}${annee}`
              : `Relevés de notes — ${label}${annee}`,
            categorie: "academique",
            obligatoire: true,
          });
        });
        break;
      }
      case "INTERRUPTION": {
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
        break;
      }
      case "IDENTITE":
      case "TOUJOURS": {
        pushUnique(list, {
          code: rule.code,
          libelle: rule.libelle,
          categorie: cat,
          obligatoire: rule.obligatoire,
        });
        break;
      }
      default:
        break;
    }
  }

  return list;
}
