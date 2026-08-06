import { requirePermission } from "@/lib/rbac";

/**
 * Autorise l'accès aux fichiers d'un dossier : candidat propriétaire, ou staff avec dossiers.read.
 * Le conseiller n'accède qu'aux dossiers qui lui sont affectés (dossierConseillerId).
 */
export function assertDossierFileAccess(
  role: string | undefined | null,
  userId: string | undefined | null,
  dossierCandidatId: string,
  dossierConseillerId?: string | null,
): { ok: true } | { ok: false; status: 401 | 403; error: string } {
  if (!role || !userId) return { ok: false, status: 401, error: "Non authentifié" };
  if (role === "CANDIDAT") {
    if (dossierCandidatId !== userId) return { ok: false, status: 403, error: "Accès refusé" };
    return { ok: true };
  }
  const gate = requirePermission(role, "dossiers.read");
  if (!gate.ok) return { ok: false, status: gate.status, error: gate.error };
  if (role === "CONSEILLER" && dossierConseillerId !== userId) {
    return { ok: false, status: 403, error: "Accès refusé — ce dossier ne vous est pas affecté" };
  }
  return { ok: true };
}

const COMBINING_DIACRITIC_MIN = 0x0300;
const COMBINING_DIACRITIC_MAX = 0x036f;

function stripDiacritics(value: string): string {
  return Array.from(value.normalize("NFD"))
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      return code < COMBINING_DIACRITIC_MIN || code > COMBINING_DIACRITIC_MAX;
    })
    .join("");
}

function slugPart(value: string): string {
  const cleaned = stripDiacritics(value)
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned.slice(0, 60) || "fichier";
}

/** Convention de nommage : NomEtudiant_TypePiece_Date.ext */
export function buildPieceFilename(
  candidatNom: string,
  libelle: string,
  ext: string,
  date: Date = new Date(),
): string {
  const d = date.toISOString().slice(0, 10);
  return `${slugPart(candidatNom)}_${slugPart(libelle)}_${d}.${ext}`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
