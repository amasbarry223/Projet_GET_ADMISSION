import crypto from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-auth";
import { saveUpload, deleteUpload } from "@/lib/storage";
import { logAudit } from "@/lib/audit";
import { notifyAttestationEmise } from "@/lib/notifications";
import { ETAPE_PAR_ETAT } from "@/shared/constants";

// POST /api/dossiers/[id]/attestation/upload — le conseiller téléverse le document de préinscription
// envoyé par l'université. Depuis PRE_ADMISSION : émet l'attestation (transition → ATTESTATION) et
// notifie le candidat (félicitations). Depuis ATTESTATION : remplace le document déjà émis.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiPermission("attestations.emit");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const dossier = await db.dossier.findUnique({
    where: { id },
    include: {
      candidat: { select: { id: true, email: true, prenom: true } },
      universite: { select: { nom: true } },
      formation: { select: { intitule: true } },
      attestation: true,
    },
  });
  if (!dossier) {
    return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
  }

  const isEmission = dossier.etat === "PRE_ADMISSION";
  const isReplace = dossier.etat === "ATTESTATION" || (dossier.etat === "CLOTURE" && !!dossier.attestation);
  if (!isEmission && !isReplace) {
    return NextResponse.json(
      { error: "Le document ne peut être téléversé que depuis « Pré-admission accordée » ou pour remplacer une attestation déjà émise." },
      { status: 400 },
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
  }

  let uploaded;
  try {
    uploaded = await saveUpload(file, `attestations/${id}`, { visibility: "private" });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload échoué" },
      { status: 400 },
    );
  }

  if (dossier.attestation?.cheminFichier) {
    await deleteUpload(dossier.attestation.cheminFichier, "private");
  }

  const attestation = await db.attestation.upsert({
    where: { dossierId: id },
    create: {
      reference: `ATT-${new Date().getFullYear()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
      codeVerification: `VRF-${crypto.randomBytes(4).toString("hex").toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`,
      dossierId: id,
      emetteurId: auth.user.id,
      cheminFichier: uploaded.cheminRelatif,
      nomFichier: uploaded.nomFichier,
    },
    update: {
      cheminFichier: uploaded.cheminRelatif,
      nomFichier: uploaded.nomFichier,
      emetteurId: auth.user.id,
    },
  });

  const auteurNom = `${auth.user.prenom} ${auth.user.nom}`;

  if (isEmission) {
    await db.dossier.update({
      where: { id },
      data: { etat: "ATTESTATION", etapeActuelle: ETAPE_PAR_ETAT.ATTESTATION },
    });
    await db.historique.create({
      data: {
        dossierId: id,
        etat: "ATTESTATION",
        auteur: auteurNom,
        auteurId: auth.user.id,
        note: `Attestation de préinscription téléversée (${uploaded.nomFichier}) — dossier transmis à l'étudiant.`,
      },
    });
  } else {
    await db.historique.create({
      data: {
        dossierId: id,
        etat: "ATTESTATION",
        auteur: auteurNom,
        auteurId: auth.user.id,
        note: `Attestation de préinscription remplacée (${uploaded.nomFichier}).`,
      },
    });
  }

  await logAudit({
    session: auth.session,
    action: isEmission ? "CREATE" : "UPDATE",
    resource: "attestation",
    resourceId: attestation.id,
    details: `${isEmission ? "Émission" : "Remplacement"} de l'attestation ${attestation.reference} pour ${dossier.reference} (fichier téléversé)`,
  });

  if (isEmission) {
    try {
      await notifyAttestationEmise({
        candidatId: dossier.candidatId,
        candidatEmail: dossier.candidat.email,
        candidatPrenom: dossier.candidat.prenom,
        dossierId: id,
        reference: dossier.reference,
        universite: dossier.universite.nom,
        formation: dossier.formation.intitule,
      });
    } catch (e) {
      console.error("[attestation/upload] notif error", e);
    }
  }

  const finalDossier = await db.dossier.findUnique({ where: { id } });
  return NextResponse.json({ success: true, attestation, dossier: finalDossier });
}
