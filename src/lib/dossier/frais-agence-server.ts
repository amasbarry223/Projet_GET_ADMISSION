import { db } from "@/lib/db";
import {
  FRAIS_AGENCE,
  getFraisCache,
  resolveFraisAgence,
  resolveFraisRange,
  setFraisCache,
  type FraisAgenceConfig,
} from "@/lib/dossier/frais-agence";

export {
  FRAIS_AGENCE,
  invalidateFraisCache,
  resolveFraisAgence,
  resolveFraisRange,
  type FraisAgenceConfig,
} from "@/lib/dossier/frais-agence";

const TTL_MS = 60_000;

/** Lecture Parametre (serveur uniquement). */
export async function getFraisAgenceConfig(): Promise<FraisAgenceConfig> {
  const now = Date.now();
  const cached = getFraisCache();
  if (cached && now - cached.at < TTL_MS) return cached.config;

  try {
    const p = await db.parametre.findUnique({ where: { id: 1 } });
    const config: FraisAgenceConfig = {
      public: p?.fraisAgencePublic ?? p?.fraisMin ?? FRAIS_AGENCE.PUBLIC,
      prive: p?.fraisAgencePrive ?? p?.fraisMax ?? FRAIS_AGENCE.PRIVE,
    };
    setFraisCache(config);
    return config;
  } catch {
    return { public: FRAIS_AGENCE.PUBLIC, prive: FRAIS_AGENCE.PRIVE };
  }
}

export async function resolveFraisAgenceAsync(
  type: string | null | undefined,
): Promise<number> {
  const config = await getFraisAgenceConfig();
  return resolveFraisAgence(type, config);
}

export async function resolveFraisRangeAsync(
  type: string | null | undefined,
): Promise<{ fraisMin: number; fraisMax: number }> {
  const config = await getFraisAgenceConfig();
  return resolveFraisRange(type, config);
}
