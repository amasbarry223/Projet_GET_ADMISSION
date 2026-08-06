import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { dossierUpdateSchema, validate } from "@/lib/validations";
import { parseJsonArray } from "@/lib/parse-json";
import { notifyDossierTransition } from "@/lib/notifications";
import { requirePermission } from "@/lib/rbac";
import {
  assertPiecesObligatoiresCompletes,
  assignConseillerIfRequested,
  resubmitCorrectedDossier,
  submitDraftDossier,
  updateDossierDraft,
} from "@/lib/dossier/dossier-update";
import type { PersonalInfoUpdate } from "@/lib/dossier/dossier-update";
import { syncPiecesDossier } from "@/lib/dossier/sync-pieces";
import { stripUndefined } from "@/shared/types/utils.types";
import { isDossierEditableByCandidate } from "@/shared/constants";

// GET /api/dossiers/[id] — détail (candidat propriétaire ou staff avec dossiers.read)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const role = session.user.role;
  const userId = session.user.id;

  const dossier = await db.dossier.findUnique({
    where: { id },
    include: {
      candidat: {
        select: {
          id: true,
          prenom: true,
          nom: true,
          email: true,
          nationalite: true,
          telephone: true,
          profilAcademique: true,
        },
      },
      universite: true,
      formation: true,
      conseiller: { select: { id: true, prenom: true, nom: true, photoUrl: true } },
      pieces: true,
      paiements: true,
      historiques: { orderBy: { date: "asc" } },
      conversation: { include: { messages: { orderBy: { createdAt: "asc" } } } },
      demandesCorrection: {
        orderBy: { createdAt: "desc" },
        include: { conseiller: { select: { prenom: true, nom: true } } },
      },
      attestation: true,
    },
  });

  if (!dossier) {
    return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
  }

  if (role === "CANDIDAT") {
    if (dossier.candidatId !== userId) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
  } else {
    const gate = requirePermission(role, "dossiers.read");
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const result = {
    ...dossier,
    candidat: {
      ...dossier.candidat,
      profilAcademique: dossier.candidat.profilAcademique
        ? {
            ...dossier.candidat.profilAcademique,
            diplomesObtenus: (() => {
              try {
                return JSON.parse(dossier.candidat.profilAcademique!.diplomesObtenus);
              } catch {
                return [];
              }
            })(),
            redoublements: (() => {
              try {
                return JSON.parse(dossier.candidat.profilAcademique!.redoublements);
              } catch {
                return [];
              }
            })(),
            interruptions: (() => {
              try {
                return JSON.parse(dossier.candidat.profilAcademique!.interruptions);
              } catch {
                return [];
              }
            })(),
          }
        : null,
    },
    universite: {
      ...dossier.universite,
      domaines: parseJsonArray(dossier.universite.domaines),
      pointsForts: parseJsonArray(dossier.universite.pointsForts),
    },
    formation: {
      ...dossier.formation,
      prerequis: parseJsonArray(dossier.formation.prerequis),
      piecesRequises: parseJsonArray(dossier.formation.piecesRequises),
    },
  };

  return NextResponse.json(result);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const role = session.user.role;
  const userId = session.user.id;

  const dossier = await db.dossier.findUnique({
    where: { id },
    select: { id: true, candidatId: true, reference: true, etat: true, conseillerId: true },
  });
  if (!dossier) {
    return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
  }

  if (role === "CANDIDAT") {
    if (dossier.candidatId !== userId) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
  } else {
    const gate = requirePermission(role, "dossiers.write");
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  if (role === "CANDIDAT" && !isDossierEditableByCandidate(dossier.etat)) {
    return NextResponse.json(
      { error: "Ce dossier ne peut plus être modifié dans son état actuel" },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = validate(dossierUpdateSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { etapeActuelle, info, pieces, action } = parsed.data;
  const conseillerId = (body as { conseillerId?: string | null })?.conseillerId;

  if (conseillerId !== undefined) {
    if (role === "CANDIDAT") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
    const assignGate = requirePermission(role, "dossiers.assign");
    if (!assignGate.ok) {
      return NextResponse.json({ error: assignGate.error }, { status: assignGate.status });
    }
  }

  const auteurLabel = `${session.user.prenom} ${session.user.nom}`;

  if (action === "soumettre" || action === "resoumettre") {
    if (action === "soumettre" && dossier.etat !== "BROUILLON") {
      return NextResponse.json(
        { error: "Seuls les brouillons peuvent être soumis" },
        { status: 400 },
      );
    }
    if (action === "resoumettre" && dossier.etat !== "CORRECTION") {
      return NextResponse.json(
        { error: "Resoumission réservée aux dossiers « À corriger »" },
        { status: 400 },
      );
    }

    // Re-sync pièces (profil + formation) avant validation
    const candidatProfil = await db.profilAcademique.findUnique({
      where: { userId: dossier.candidatId },
    });
    const dossierFormation = await db.dossier.findUnique({
      where: { id },
      select: { formation: { select: { piecesRequises: true } } },
    });
    if (candidatProfil) {
      await syncPiecesDossier(
        db,
        id,
        {
          statutCandidat: candidatProfil.statutCandidat,
          classeActuelle: candidatProfil.classeActuelle,
          aObtenuBac: candidatProfil.aObtenuBac,
          trimestresSeconde: candidatProfil.trimestresSeconde,
          trimestresPremiere: candidatProfil.trimestresPremiere,
          trimestresTerminale: candidatProfil.trimestresTerminale,
          attestationScolariteDisponible: candidatProfil.attestationScolariteDisponible,
          niveauEtudesSuperieures: candidatProfil.niveauEtudesSuperieures,
          formationEnCours: candidatProfil.formationEnCours,
          diplomesObtenus: candidatProfil.diplomesObtenus,
          redoublements: candidatProfil.redoublements,
          interruptions: candidatProfil.interruptions,
        },
        { ...(dossierFormation?.formation.piecesRequises != null
            ? { formationPiecesRequises: dossierFormation.formation.piecesRequises }
            : {}) },
      );
    }

    const piecesError = await assertPiecesObligatoiresCompletes(id);
    if (piecesError) return piecesError;
  }

  let updated;
  try {
    updated = await db.$transaction(async (tx) => {
      const notes: string[] = [];
      let nouvelEtat = dossier.etat;

      if (conseillerId !== undefined && role !== "CANDIDAT") {
        await assignConseillerIfRequested(tx, {
          dossierId: id,
          conseillerId,
          notes,
        });
      }

      if (action === "soumettre") {
        nouvelEtat = await submitDraftDossier(tx, {
          dossierId: id,
          currentConseillerId: dossier.conseillerId,
          notes,
        });
      } else if (action === "resoumettre") {
        nouvelEtat = await resubmitCorrectedDossier(tx, {
          dossierId: id,
          notes,
        });
      } else {
        await updateDossierDraft(tx, {
          dossierId: id,
          candidatId: dossier.candidatId,
          role,
          ...(etapeActuelle !== undefined ? { etapeActuelle } : {}),
          ...(info ? { info: stripUndefined(info) as PersonalInfoUpdate } : {}),
          ...(pieces ? { pieces } : {}),
          notes,
        });
      }

      // Soumission / resoumission : appliquer aussi les mises à jour info/pièces si fournies
      if (action === "soumettre" || action === "resoumettre") {
        await updateDossierDraft(tx, {
          dossierId: id,
          candidatId: dossier.candidatId,
          role,
          ...(info ? { info: stripUndefined(info) as PersonalInfoUpdate } : {}),
          ...(pieces ? { pieces } : {}),
          notes,
        });
      }

      if (notes.length > 0) {
        await tx.historique.create({
          data: {
            dossierId: id,
            etat: nouvelEtat as "BROUILLON" | "SOUMIS" | "VERIFICATION" | "CORRECTION",
            auteur: auteurLabel,
            auteurId: userId,
            note: notes.join(" · "),
          },
        });
      }

      return tx.dossier.findUnique({
        where: { id },
        include: {
          candidat: {
            select: {
              id: true,
              prenom: true,
              nom: true,
              email: true,
              nationalite: true,
              telephone: true,
              dateNaissance: true,
              adresse: true,
            },
          },
          universite: true,
          formation: true,
          pieces: true,
          historiques: { orderBy: { date: "asc" } },
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "CONSEILLER_INVALIDE") {
      return NextResponse.json(
        { error: "Conseiller invalide : rôle CONSEILLER actif requis" },
        { status: 400 },
      );
    }
    if (error instanceof Error && error.message === "SUBMIT_RACE") {
      return NextResponse.json(
        { error: "Ce dossier a déjà été soumis. Actualisez la page." },
        { status: 409 },
      );
    }
    throw error;
  }

  if (action === "soumettre" || action === "resoumettre") {
    try {
      await notifyDossierTransition({
        candidatId: dossier.candidatId,
        dossierId: id,
        reference: dossier.reference,
        nouvelEtat: action === "soumettre" ? "SOUMIS" : "VERIFICATION",
        note:
          action === "soumettre"
            ? "Votre dossier a été soumis."
            : "Vos corrections ont été renvoyées.",
      });
    } catch {
      // ignore
    }
  }

  return NextResponse.json(updated);
}
