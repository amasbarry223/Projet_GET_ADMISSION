import type { Prisma, PrismaClient } from "@prisma/client";
import {
  buildPiecesDossier,
  type PieceRequise,
  type ProfilAcademiqueInput,
} from "@/lib/dossier/pieces-requises";
import { EDITABLE_DOSSIER_STATES } from "@/shared/constants";

type Tx = Prisma.TransactionClient | PrismaClient;

export type ProfilForSync = ProfilAcademiqueInput & {
  diplomesObtenus?: string;
  redoublements?: string;
  interruptions?: string;
};

export type SyncPiecesOptions = {
  /** Liste déjà fusionnée (profil + formation). */
  required?: PieceRequise[];
  /** Pièces catalogue formation à fusionner si `required` absent. */
  formationPiecesRequises?: string[] | string | null;
};

/**
 * Synchronise les pièces d'un dossier avec le profil académique (+ formation).
 * - Ajoute les codes manquants
 * - Supprime uniquement les pièces manquantes (sans fichier) dont le code n'est plus requis
 * - Conserve les pièces avec fichier même si le code disparaît (passe obligatoire=false)
 */
export async function syncPiecesDossier(
  tx: Tx,
  dossierId: string,
  profil: ProfilForSync,
  options?: SyncPiecesOptions
): Promise<{ added: number; removed: number; keptObsolete: number }> {
  let formationPieces = options?.formationPiecesRequises;
  if (formationPieces === undefined && !options?.required) {
    const dossier = await tx.dossier.findUnique({
      where: { id: dossierId },
      select: { formation: { select: { piecesRequises: true } } },
    });
    formationPieces = dossier?.formation.piecesRequises ?? null;
  }

  const required =
    options?.required ?? buildPiecesDossier(profil, formationPieces);
  const requiredByCode = new Map(required.map((p) => [p.code, p]));

  const existing = await tx.piece.findMany({ where: { dossierId } });
  const existingByCode = new Map(
    existing.filter((p) => p.code).map((p) => [p.code as string, p])
  );

  let added = 0;
  let removed = 0;
  let keptObsolete = 0;

  const toCreate = required.filter((p) => !existingByCode.has(p.code));
  if (toCreate.length > 0) {
    await tx.piece.createMany({
      data: toCreate.map((p) => ({
        dossierId,
        code: p.code,
        libelle: p.libelle,
        categorie: p.categorie,
        obligatoire: p.obligatoire,
        statut: "manquante",
        type: p.categorie === "identite" && p.code === "IDENTITE_PHOTO" ? "image" : "pdf",
      })),
    });
    added = toCreate.length;
  }

  for (const p of required) {
    const cur = existingByCode.get(p.code);
    if (!cur) continue;
    if (
      cur.libelle !== p.libelle ||
      cur.obligatoire !== p.obligatoire ||
      cur.categorie !== p.categorie
    ) {
      await tx.piece.update({
        where: { id: cur.id },
        data: {
          libelle: p.libelle,
          obligatoire: p.obligatoire,
          categorie: p.categorie,
        },
      });
    }
  }

  for (const cur of existing) {
    if (!cur.code) {
      if (!cur.cheminFichier && cur.statut === "manquante") {
        await tx.piece.delete({ where: { id: cur.id } });
        removed += 1;
      }
      continue;
    }
    if (requiredByCode.has(cur.code)) continue;

    if (!cur.cheminFichier && cur.statut === "manquante") {
      await tx.piece.delete({ where: { id: cur.id } });
      removed += 1;
    } else {
      await tx.piece.update({
        where: { id: cur.id },
        data: { obligatoire: false },
      });
      keptObsolete += 1;
    }
  }

  return { added, removed, keptObsolete };
}

/** Synchronise les dossiers éditables (BROUILLON + CORRECTION) d'un candidat. */
export async function syncPiecesBrouillonsCandidat(
  db: PrismaClient,
  candidatId: string,
  profil: ProfilForSync
) {
  const dossiers = await db.dossier.findMany({
    where: {
      candidatId,
      etat: { in: [...EDITABLE_DOSSIER_STATES] },
    },
    select: {
      id: true,
      formation: { select: { piecesRequises: true } },
    },
  });

  let totalAdded = 0;
  let totalRemoved = 0;

  for (const d of dossiers) {
    const result = await syncPiecesDossier(db, d.id, profil, {
      formationPiecesRequises: d.formation.piecesRequises,
    });
    totalAdded += result.added;
    totalRemoved += result.removed;
  }

  return { count: dossiers.length, added: totalAdded, removed: totalRemoved };
}
