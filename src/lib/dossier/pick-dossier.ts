import { isClosedDossierState } from "@/shared/constants";

type DossierLike = {
  id: string;
  etat: string;
  updatedAt: string | Date;
};

/**
 * Sélectionne le dossier « actif » pour l’espace candidat.
 * Priorité : `preferredId` (query) → dossiers non clos les plus récents → plus récent global.
 */
export function pickPrimaryDossier<T extends DossierLike>(
  dossiers: T[],
  preferredId?: string | null
): T | null {
  if (!Array.isArray(dossiers) || dossiers.length === 0) return null;

  if (preferredId) {
    const match = dossiers.find((d) => d.id === preferredId);
    if (match) return match;
  }

  const open = dossiers.filter((d) => !isClosedDossierState(d.etat));
  const pool = open.length > 0 ? open : dossiers;

  return [...pool].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )[0]!;
}
