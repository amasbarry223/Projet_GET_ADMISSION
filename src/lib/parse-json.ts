import { z } from "zod";

/** Parse un champ JSON stocké en string (sans dépendance Prisma / DB). */
export function parseJsonArray(field: string | null | undefined): string[] {
  if (!field) return [];
  try {
    const parsed: unknown = JSON.parse(field);
    const result = z.array(z.string()).safeParse(parsed);
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

/** Parse strict : lève si le JSON n’est pas un tableau de strings. */
export function parseJsonStringArrayStrict(field: string): string[] {
  const parsed: unknown = JSON.parse(field);
  return z.array(z.string()).parse(parsed);
}
