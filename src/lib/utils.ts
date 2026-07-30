import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Génère un slug ASCII safe à partir d'une chaîne (gère les accents).
 * Exemple : "Université de Lomé" → "universite-de-lome"
 */
export function slugify(input: string): string {
  return input
    .toString()
    .normalize("NFD") // décompose les accents
    .replace(/[\u0300-\u036f]/g, "") // supprime les diacritiques
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // supprime tout sauf alphanum, espace, tiret
    .replace(/[\s_-]+/g, "-") // collapse espaces/tirets
    .replace(/^-+|-+$/g, ""); // trim des tirets en début/fin
}

/**
 * Génère un slug unique en ajoutant un suffixe numérique si nécessaire.
 */
export async function uniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>
): Promise<string> {
  const root = slugify(base) || "item";
  let candidate = root;
  let i = 2;
  while (await exists(candidate)) {
    candidate = `${root}-${i}`;
    i++;
  }
  return candidate;
}
