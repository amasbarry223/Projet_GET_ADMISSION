import { NextResponse } from "next/server";
import type { EtatDossier, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { listPiecesManquantes } from "@/lib/dossier/pieces-requises";
import { markCorrectionSubmitted } from "@/lib/dossier/correction";
import {
  CLOSED_DOSSIER_STATES,
  ETAPE_PAR_ETAT,
  PIECE_STATUSES,
} from "@/shared/constants";

type Tx = Prisma.TransactionClient;

type PersonalInfoUpdate = {
  prenom?: string;
  nom?: string;
  telephone?: string;
  nationalite?: string;
  dateNaissance?: string;
  adresse?: string;
};

export type { PersonalInfoUpdate };

type PieceUpdateInput = {
  libelle: string;
  statut: string;
};

export async function assertPiecesObligatoiresCompletes(
  dossierId: string,
): Promise<NextResponse | null> {
  const piecesDb = await db.piece.findMany({ where: { dossierId } });
  const obligatoires = piecesDb.filter((piece) => piece.obligatoire !== false);

  if (obligatoires.length === 0) {
    return NextResponse.json(
      {
        error:
          "Aucune pièce obligatoire n'est associée au dossier. Complétez votre profil académique.",
      },
      { status: 400 },
    );
  }

  const incompletes = listPiecesManquantes(piecesDb);

  if (incompletes.length > 0) {
    return NextResponse.json(
      {
        error: `${incompletes.length} pièce(s) obligatoire(s) manquante(s) ou à corriger`,
        piecesManquantes: incompletes.map((piece) => piece.libelle),
      },
      { status: 400 },
    );
  }

  return null;
}

async function assignLeastLoadedConseiller(
  tx: Tx,
  currentConseillerId: string | null,
  notes: string[],
): Promise<string | null> {
  if (currentConseillerId) return currentConseillerId;

  const conseillers = await tx.user.findMany({
    where: { role: "CONSEILLER", actif: true },
    select: {
      id: true,
      dossiersConseiller: {
        where: {
          etat: { notIn: [...CLOSED_DOSSIER_STATES] as EtatDossier[] },
        },
        select: { id: true },
      },
    },
  });

  if (conseillers.length === 0) return null;

  conseillers.sort(
    (a, b) => a.dossiersConseiller.length - b.dossiersConseiller.length,
  );
  notes.push("Conseiller affecté automatiquement");
  return conseillers[0]!.id;
}

export async function submitDraftDossier(
  tx: Tx,
  params: {
    dossierId: string;
    currentConseillerId: string | null;
    notes: string[];
  },
): Promise<"SOUMIS"> {
  const autoConseillerId = await assignLeastLoadedConseiller(
    tx,
    params.currentConseillerId,
    params.notes,
  );

  // Atomique : ne soumet que si encore BROUILLON (anti double-submit)
  const locked = await tx.dossier.updateMany({
    where: { id: params.dossierId, etat: "BROUILLON" },
    data: {
      etat: "SOUMIS",
      etapeActuelle: ETAPE_PAR_ETAT.SOUMIS,
      ...(autoConseillerId ? { conseillerId: autoConseillerId } : {}),
    },
  });
  if (locked.count === 0) {
    throw new Error("SUBMIT_RACE");
  }
  params.notes.push("Dossier soumis — entrée en file de traitement");
  return "SOUMIS";
}

export async function resubmitCorrectedDossier(
  tx: Tx,
  params: { dossierId: string; notes: string[] },
): Promise<"VERIFICATION"> {
  const locked = await tx.dossier.updateMany({
    where: { id: params.dossierId, etat: "CORRECTION" },
    data: {
      etat: "VERIFICATION",
      etapeActuelle: ETAPE_PAR_ETAT.VERIFICATION,
    },
  });
  if (locked.count === 0) {
    throw new Error("SUBMIT_RACE");
  }
  await markCorrectionSubmitted(tx, params.dossierId);
  params.notes.push("Corrections resoumises — retour en vérification");
  return "VERIFICATION";
}

export async function updateDossierDraft(
  tx: Tx,
  params: {
    dossierId: string;
    candidatId: string;
    role: string | undefined;
    etapeActuelle?: number;
    info?: PersonalInfoUpdate;
    pieces?: PieceUpdateInput[];
    notes: string[];
  },
): Promise<void> {
  const { info, pieces, etapeActuelle, role, notes } = params;

  if (info) {
    const data: Record<string, string> = {};
    if (info.prenom !== undefined) data.prenom = info.prenom;
    if (info.nom !== undefined) data.nom = info.nom;
    if (info.telephone !== undefined) data.telephone = info.telephone;
    if (info.nationalite !== undefined) data.nationalite = info.nationalite;
    if (info.dateNaissance !== undefined) data.dateNaissance = info.dateNaissance;
    if (info.adresse !== undefined) data.adresse = info.adresse;
    if (Object.keys(data).length > 0) {
      await tx.user.update({ where: { id: params.candidatId }, data });
      notes.push("Informations personnelles mises à jour");
    }
  }

  if (pieces && pieces.length > 0) {
    for (const pieceInput of pieces) {
      // Candidat : upload multipart uniquement pour televersee/validee/a_corriger
      let statut = pieceInput.statut;
      if (role === "CANDIDAT") {
        if (
          statut === PIECE_STATUSES.VALIDEE ||
          statut === PIECE_STATUSES.A_CORRIGER ||
          statut === PIECE_STATUSES.TELEVERSEE
        ) {
          statut = PIECE_STATUSES.MANQUANTE;
        }
      }

      const existing = await tx.piece.findFirst({
        where: { dossierId: params.dossierId, libelle: pieceInput.libelle },
      });

      if (existing) {
        if (
          (statut === PIECE_STATUSES.TELEVERSEE || statut === PIECE_STATUSES.VALIDEE) &&
          !existing.cheminFichier
        ) {
          continue;
        }
        await tx.piece.update({
          where: { id: existing.id },
          data: {
            statut,
            ...(statut === PIECE_STATUSES.TELEVERSEE || statut === PIECE_STATUSES.VALIDEE
              ? { televerseeLe: new Date() }
              : {}),
          },
        });
      } else if (statut === PIECE_STATUSES.MANQUANTE) {
        await tx.piece.create({
          data: {
            dossierId: params.dossierId,
            libelle: pieceInput.libelle,
            statut: PIECE_STATUSES.MANQUANTE,
            televerseeLe: null,
          },
        });
      }
    }
    notes.push(`${pieces.length} pièce(s) mise(s) à jour`);
  }

  if (etapeActuelle !== undefined) {
    // Candidat : progression wizard 1–5 uniquement (ne pas écraser l'ordre workflow 1–12)
    const stepToSave =
      role === "CANDIDAT"
        ? Math.min(5, Math.max(1, etapeActuelle))
        : etapeActuelle;
    await tx.dossier.update({
      where: { id: params.dossierId },
      data: { etapeActuelle: stepToSave },
    });
    notes.push(`Étape passée à ${stepToSave}`);
  }
}

export async function assignConseillerIfRequested(
  tx: Tx,
  params: {
    dossierId: string;
    conseillerId: string | null;
    notes: string[];
  },
): Promise<void> {
  if (params.conseillerId) {
    const conseiller = await tx.user.findUnique({
      where: { id: params.conseillerId },
      select: { prenom: true, nom: true, role: true, actif: true },
    });
    if (!conseiller || conseiller.role !== "CONSEILLER" || !conseiller.actif) {
      throw new Error("CONSEILLER_INVALIDE");
    }
    await tx.dossier.update({
      where: { id: params.dossierId },
      data: { conseillerId: params.conseillerId },
    });
    params.notes.push(`Conseiller affecté : ${conseiller.prenom} ${conseiller.nom}`);
    return;
  }

  await tx.dossier.update({
    where: { id: params.dossierId },
    data: { conseillerId: null },
  });
  params.notes.push("Conseiller désaffecté");
}

/**
 * Affecte l'établissement réel d'un dossier en procédure Université Publique (le candidat ne l'a
 * pas choisi lui-même — cf. Dossier.procedure). Ne resynchronise pas les pièces : l'appelant doit
 * relancer syncPiecesDossier() avec le profil académique du candidat une fois la formation changée,
 * comme lors d'une resoumission.
 */
export async function assignFormationIfRequested(
  tx: Tx,
  params: {
    dossierId: string;
    formationId: string;
    notes: string[];
  },
): Promise<void> {
  const formation = await tx.formation.findUnique({
    where: { id: params.formationId },
    include: { universite: true },
  });
  if (!formation) {
    throw new Error("FORMATION_INTROUVABLE");
  }
  if (formation.universite.typeEtablissement !== "PUBLIC" || formation.universite.estPlaceholder) {
    throw new Error("ETABLISSEMENT_INVALIDE");
  }

  await tx.dossier.update({
    where: { id: params.dossierId },
    data: { universiteId: formation.universiteId, formationId: formation.id },
  });
  params.notes.push(`Établissement affecté : ${formation.universite.nom} — ${formation.intitule}`);
}
