/** Parse un champ JSON stocké en string (sans dépendance Prisma / DB). */
export function parseJsonArray(field: string | null | undefined): string[] {
  if (!field) return [];
  try {
    const parsed = JSON.parse(field);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
