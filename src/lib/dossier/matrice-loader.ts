import { db } from "@/lib/db";
import type { MatriceRegleInput } from "@/lib/dossier/matrice-engine";

let cache: { at: number; regles: MatriceRegleInput[] | null } = {
  at: 0,
  regles: null,
};

const TTL_MS = 30_000;

export function invalidateMatriceCache() {
  cache = { at: 0, regles: null };
}

/** Charge les règles de la matrice ACTIVE (cache 30s). */
export async function loadActiveMatriceRegles(): Promise<MatriceRegleInput[] | null> {
  const now = Date.now();
  if (cache.regles !== null && now - cache.at < TTL_MS) {
    return cache.regles;
  }

  try {
    const version = await db.matriceVersion.findFirst({
      where: { statut: "ACTIVE" },
      include: { regles: { orderBy: { ordre: "asc" } } },
    });
    const regles =
      version?.regles.map((r) => ({
        code: r.code,
        libelle: r.libelle,
        categorie: r.categorie,
        obligatoire: r.obligatoire,
        condition: r.condition,
        niveauMin: r.niveauMin,
        meta: r.meta,
        ordre: r.ordre,
      })) ?? null;

    cache = { at: now, regles };
    return regles;
  } catch {
    // Client Prisma pas encore généré / table absente
    return null;
  }
}
