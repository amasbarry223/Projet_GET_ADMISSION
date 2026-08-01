/** Frais d'agence selon le type d'établissement (FCFA). */
export const FRAIS_AGENCE = {
  PUBLIC: 65_000,
  PRIVE: 110_000,
} as const;

export type TypeEtablissementFrais = keyof typeof FRAIS_AGENCE;

export function resolveFraisAgence(type: string | null | undefined): number {
  if (type === "PUBLIC") return FRAIS_AGENCE.PUBLIC;
  return FRAIS_AGENCE.PRIVE;
}

/** Min/max alignés sur le type (montant unique). */
export function resolveFraisRange(type: string | null | undefined): {
  fraisMin: number;
  fraisMax: number;
} {
  const montant = resolveFraisAgence(type);
  return { fraisMin: montant, fraisMax: montant };
}
