import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { dossierUpdateSchema, validate } from "@/lib/validations";
import { parseJsonArray } from "@/lib/parse-json";
import { notifyDossierTransition } from "@/lib/notifications";
import { requirePermission } from "@/lib/rbac";
import {
  assertPiecesObligatoiresCompletes,
  assignConseillerIfRequested,
  assignFormationIfRequested,
  resubmitCorrectedDossier,
  submitDraftDossier,
  updateDossierDraft,
} from "@/lib/dossier/dossier-update";
import type { PersonalInfoUpdate } from "@/lib/dossier/dossier-update";
import { syncPiecesDossier } from "@/lib/dossier/sync-pieces";
import { logAudit } from "@/lib/audit";
import { stripUndefined } from "@/shared/types/utils.types";
import { isDossierEditableByCandidate, ETAPE_PAR_ETAT } from "@/shared/constants";

// GET /api/dossiers/[id] — détail (candidat propriétaire ou staff avec dossiers.read)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
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
          kycType: true,
          kycRectoPath: true,
          kycVersoPath: true,
          kycVerifie: true,
          profilAcademique: true,
        },
      },
      universite: true,
      formation: true,
      conseiller: { select: { id: true, prenom: true, nom: true, photoUrl: true } },
      pieces: true,
      paiements: true,
      historiques: { orderBy: { date: "asc" } },
      conversation: {
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            include: { auteur: { select: { prenom: true, nom: true, role: true } } },
          },
        },
      },
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
    // Le conseiller ne peut consulter que les dossiers qui lui sont affectés.
    if (role === "CONSEILLER" && dossier.conseillerId !== userId) {
      return NextResponse.json({ error: "Accès refusé — ce dossier ne vous est pas affecté" }, { status: 403 });
    }
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
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const role = session.user.role;
  const userId = session.user.id;

  const dossier = await db.dossier.findUnique({
    where: { id },
    select: {
      id: true,
      candidatId: true,
      reference: true,
      etat: true,
      conseillerId: true,
      procedure: true,
      universite: { select: { estPlaceholder: true } },
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
    const gate = requirePermission(role, "dossiers.write");
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
    // Le conseiller ne peut agir que sur les dossiers qui lui sont affectés.
    if (role === "CONSEILLER" && dossier.conseillerId !== userId) {
      return NextResponse.json({ error: "Accès refusé — ce dossier ne vous est pas affecté" }, { status: 403 });
    }
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
    if (dossier.etat === "CLOTURE") {
      return NextResponse.json(
        { error: "Le dossier est clôturé et ne peut plus être affecté." },
        { status: 400 },
      );
    }
    if (conseillerId !== null && dossier.etat === "BROUILLON") {
      return NextResponse.json(
        { error: "Le dossier doit être soumis avant d'être affecté à un conseiller." },
        { status: 400 },
      );
    }
    // Une fois le dossier accepté par un conseiller (l'état a quitté SOUMIS),
    // l'affectation ne peut plus être modifiée ni désaffectée par Admin/Super Admin.
    if (dossier.etat !== "SOUMIS" && dossier.etat !== "BROUILLON") {
      return NextResponse.json(
        { error: "Le dossier a été accepté par le conseiller affecté, l'affectation ne peut plus être modifiée." },
        { status: 409 },
      );
    }
  }

  // Affectation de l'établissement (procédure Université Publique) — Conseiller, Admin, Super Admin.
  const formationId = (body as { formationId?: string })?.formationId;
  if (formationId !== undefined) {
    if (role === "CANDIDAT") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
    const assignGate = requirePermission(role, "etablissement.assign");
    if (!assignGate.ok) {
      return NextResponse.json({ error: assignGate.error }, { status: assignGate.status });
    }
    if (dossier.procedure !== "PUBLIQUE") {
      return NextResponse.json(
        { error: "L'affectation d'établissement n'est disponible que pour la procédure Université Publique." },
        { status: 400 },
      );
    }
    const etape = ETAPE_PAR_ETAT[dossier.etat];
    if (etape < ETAPE_PAR_ETAT.VERIFICATION || etape > ETAPE_PAR_ETAT.PAIEMENT_CONFIRME) {
      return NextResponse.json(
        { error: "L'établissement ne peut être affecté qu'entre la vérification et la confirmation du paiement." },
        { status: 400 },
      );
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
    if (action === "soumettre") {
      const candidatUser = await db.user.findUnique({
        where: { id: dossier.candidatId },
        select: {
          kycType: true,
          kycNumero: true,
          kycRectoPath: true,
          kycVersoPath: true,
        },
      });
      const kycTypeLower = (candidatUser?.kycType || "passeport").toLowerCase().trim();
      const isCni = kycTypeLower === "cni" || kycTypeLower.includes("carte");
      const needsVerso = isCni;
      const isKycComplete = Boolean(
        candidatUser?.kycNumero?.trim() &&
        candidatUser?.kycRectoPath &&
        (!needsVerso || candidatUser?.kycVersoPath)
      );

      if (!isKycComplete) {
        return NextResponse.json(
          {
            error:
              "Vous devez obligatoirement renseigner et téléverser votre pièce d'identité (KYC) dans votre profil avant de soumettre votre dossier.",
            code: "KYC_REQUIRED",
          },
          { status: 400 },
        );
      }
    }
    if (action === "resoumettre" && dossier.etat !== "CORRECTION") {
      return NextResponse.json(
        { error: "Resoumission réservée aux dossiers « À corriger »" },
        { status: 400 },
      );
    }

    // Re-sync pièces (profil + formation) avant validation pour purger les pièces d'identité doublons
    const candidatProfil = await db.profilAcademique.findUnique({
      where: { userId: dossier.candidatId },
    });
    const dossierFormation = await db.dossier.findUnique({
      where: { id },
      select: { formation: { select: { piecesRequises: true } } },
    });
    
    await syncPiecesDossier(
      db,
      id,
      candidatProfil
        ? {
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
          }
        : {
            statutCandidat: "BACHELIER",
            niveauEtudesSuperieures: "AUCUN",
          },
      { ...(dossierFormation?.formation.piecesRequises != null
          ? { formationPiecesRequises: dossierFormation.formation.piecesRequises }
          : {}) },
    );

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

      if (formationId !== undefined && role !== "CANDIDAT") {
        await assignFormationIfRequested(tx, {
          dossierId: id,
          formationId,
          notes,
        });
      }

      if (action === "soumettre") {
        nouvelEtat = await submitDraftDossier(tx, {
          dossierId: id,
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
    if (error instanceof Error && error.message === "FORMATION_INTROUVABLE") {
      return NextResponse.json({ error: "Formation introuvable" }, { status: 404 });
    }
    if (error instanceof Error && error.message === "ETABLISSEMENT_INVALIDE") {
      return NextResponse.json(
        { error: "Cet établissement n'est pas un établissement public affectable" },
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

  // Établissement affecté (procédure Publique) : la nouvelle formation peut porter des pièces
  // requises supplémentaires — resynchronise exactement comme lors d'une resoumission.
  if (formationId !== undefined && updated) {
    const candidatProfil = await db.profilAcademique.findUnique({ where: { userId: dossier.candidatId } });
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
        { formationPiecesRequises: updated.formation.piecesRequises },
      );
    }
  }

  return NextResponse.json(updated);
}

// DELETE /api/dossiers/[id] — supprimer un dossier (Super Admin ou Admin avec dossiers.write)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const role = session.user.role;
  const gate = requirePermission(role, "dossiers.write");
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;
  const dossier = await db.dossier.findUnique({
    where: { id },
    select: {
      id: true,
      reference: true,
      candidatId: true,
      candidat: { select: { prenom: true, nom: true, email: true } },
    },
  });

  if (!dossier) {
    return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
  }

  await db.$transaction(async (tx) => {
    await tx.message.deleteMany({ where: { conversation: { dossierId: id } } });
    await tx.conversation.deleteMany({ where: { dossierId: id } });
    await tx.demandeCorrection.deleteMany({ where: { dossierId: id } });
    await tx.demandeCrous.deleteMany({ where: { dossierId: id } });
    await tx.attestation.deleteMany({ where: { dossierId: id } });
    await tx.piece.deleteMany({ where: { dossierId: id } });
    await tx.historique.deleteMany({ where: { dossierId: id } });
    await tx.paiement.deleteMany({ where: { dossierId: id } });
    await tx.dossier.delete({ where: { id } });
  });

  await logAudit({
    session,
    action: "DELETE",
    resource: "dossier",
    resourceId: id,
    details: `Dossier supprimé : ${dossier.reference} (${dossier.candidat.prenom} ${dossier.candidat.nom} - ${dossier.candidat.email})`,
  });

  return NextResponse.json({ success: true, id });
}
