/**
 * Types utilitaires et brands d’IDs métier.
 * Les brands évitent de confondre userId / dossierId / etc. à la compilation.
 * Prisma reste en `string` ; brandir aux frontières app/API.
 */

// ---------------------------------------------------------------------------
// Brands
// ---------------------------------------------------------------------------

declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

export type UserId = Brand<string, "UserId">;
export type DossierId = Brand<string, "DossierId">;
export type UniversiteId = Brand<string, "UniversiteId">;
export type FormationId = Brand<string, "FormationId">;
export type PieceId = Brand<string, "PieceId">;
export type PaiementId = Brand<string, "PaiementId">;
export type TransactionId = Brand<string, "TransactionId">;

export function asUserId(id: string): UserId {
  return id as UserId;
}
export function asDossierId(id: string): DossierId {
  return id as DossierId;
}
export function asUniversiteId(id: string): UniversiteId {
  return id as UniversiteId;
}
export function asFormationId(id: string): FormationId {
  return id as FormationId;
}
export function asPieceId(id: string): PieceId {
  return id as PieceId;
}
export function asPaiementId(id: string): PaiementId {
  return id as PaiementId;
}
export function asTransactionId(id: string): TransactionId {
  return id as TransactionId;
}

// ---------------------------------------------------------------------------
// Utilitaires génériques
// ---------------------------------------------------------------------------

/** Rendre certains champs requis. */
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/** Objet avec au moins une propriété. */
export type NonEmptyObject<T extends object> = keyof T extends never ? never : T;

/** Réponse API générique. */
export type ApiResponse<T> = {
  data: T;
  message?: string;
  success: boolean;
};

/** Pagination standard. */
export type PaginatedData<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

/** État async UI. */
export type AsyncState<T> = {
  data: T | null;
  isLoading: boolean;
  error: string | null;
};

/** Message lisible depuis une erreur inconnue. */
export function getErrorMessage(error: unknown, fallback = "Une erreur est survenue."): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

/** Retire les clés dont la valeur est `undefined` (exactOptionalPropertyTypes). */
export function stripUndefined<T extends Record<string, unknown>>(
  obj: T,
): { [K in keyof T]?: Exclude<T[K], undefined> } {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as { [K in keyof T]?: Exclude<T[K], undefined> };
}

export function createPaginatedData<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedData<T> {
  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}
