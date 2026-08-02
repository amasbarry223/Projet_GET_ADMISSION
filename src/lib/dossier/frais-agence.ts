/** Defaults CDC si Parametre absent. Safe côté client (aucune dépendance Prisma). */
export const FRAIS_AGENCE = {
  PUBLIC: 65_000,
  PRIVE: 110_000,
} as const;

export type TypeEtablissementFrais = keyof typeof FRAIS_AGENCE;

export type FraisAgenceConfig = {
  public: number;
  prive: number;
};

/** Cache mémoire partagé (rempli uniquement côté serveur via frais-agence-server). */
let cache: { at: number; config: FraisAgenceConfig } | null = null;

export function getFraisCache(): { at: number; config: FraisAgenceConfig } | null {
  return cache;
}

export function setFraisCache(config: FraisAgenceConfig) {
  cache = { at: Date.now(), config };
}

export function invalidateFraisCache() {
  cache = null;
}

/** Sync — utilise le cache mémoire ou les defaults (côté client / hors DB). */
export function resolveFraisAgence(
  type: string | null | undefined,
  config?: FraisAgenceConfig | null,
): number {
  const cfg = config ?? cache?.config ?? {
    public: FRAIS_AGENCE.PUBLIC,
    prive: FRAIS_AGENCE.PRIVE,
  };
  if (type === "PUBLIC") return cfg.public;
  return cfg.prive;
}

export function resolveFraisRange(
  type: string | null | undefined,
  config?: FraisAgenceConfig | null,
): { fraisMin: number; fraisMax: number } {
  const montant = resolveFraisAgence(type, config);
  return { fraisMin: montant, fraisMax: montant };
}
