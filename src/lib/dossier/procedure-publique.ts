import { db } from "@/lib/db";

/**
 * Université/formation techniques utilisées pour un dossier en procédure Université Publique tant
 * que le staff n'a pas affecté un établissement réel (cf. Universite.estPlaceholder). Créées par la
 * migration prisma/migrations/20260806150000_procedure_admission_publique — cette fonction lit
 * toujours la ligne réelle en base (jamais d'ID en dur) pour rester valable sur tout environnement.
 */

export type PlaceholderProcedurePublique = { universiteId: string; formationId: string };

const TTL_MS = 60_000;
let cache: { at: number; value: PlaceholderProcedurePublique } | null = null;

export async function getPublicProcedurePlaceholder(): Promise<PlaceholderProcedurePublique> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.value;

  const universite = await db.universite.findFirst({
    where: { estPlaceholder: true },
    select: { id: true, formations: { select: { id: true }, take: 1 } },
  });
  const formation = universite?.formations[0];
  if (!universite || !formation) {
    throw new Error(
      "Établissement placeholder de la procédure publique introuvable — vérifier la migration 20260806150000_procedure_admission_publique.",
    );
  }

  const value: PlaceholderProcedurePublique = { universiteId: universite.id, formationId: formation.id };
  cache = { at: now, value };
  return value;
}

/** Vrai si l'université pointée par un dossier est encore le placeholder (établissement pas affecté). */
export function isPlaceholderUniversite(universite: { estPlaceholder?: boolean } | null | undefined): boolean {
  return !!universite?.estPlaceholder;
}
