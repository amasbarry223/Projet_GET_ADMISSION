import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiPermission, parseOrRespond } from "@/lib/api-auth";
import { logementReservationSchema } from "@/lib/validations";
import { deleteUpload } from "@/lib/storage";
import { logAudit } from "@/lib/audit";
import { broadcastLogementLive } from "@/lib/logement/live-broadcast";

// GET /api/admin/logement/[id] — détail d'une demande de logement (staff)
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiPermission("logement.read");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const reservation = await db.logementReservation.findUnique({
    where: { id },
    include: { candidat: { select: { id: true, prenom: true, nom: true, email: true } } },
  });
  if (!reservation) {
    return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  }
  return NextResponse.json(reservation);
}

// PUT /api/admin/logement/[id] — le staff modifie les informations d'une demande
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiPermission("logement.write");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const existing = await db.logementReservation.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  }

  if (existing.statut === "traite") {
    return NextResponse.json({ error: "Cette demande de logement a déjà été traitée et ne peut plus être modifiée." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = parseOrRespond(logementReservationSchema, body);
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;

  const updated = await db.logementReservation.update({
    where: { id },
    data: {
      civilite: input.civilite,
      nom: input.nom,
      prenom: input.prenom,
      dateNaissance: input.dateNaissance,
      nationalite: input.nationalite,
      telephone: input.telephone,
      email: input.email,
      agenceAccompagnante: input.agenceAccompagnante || null,
      numeroPasseport: input.numeroPasseport,
      paysDemandeVisa: input.paysDemandeVisa,
      villeEtablissementFrance: input.villeEtablissementFrance,
      dateArriveePrevue: input.dateArriveePrevue,
    },
  });

  await logAudit({
    session: auth.session,
    action: "UPDATE",
    resource: "logement",
    resourceId: id,
    details: `Demande de logement modifiée : ${updated.prenom} ${updated.nom}`,
  });

  return NextResponse.json(updated);
}

// PATCH /api/admin/logement/[id] — modification rapide du statut
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiPermission("logement.write");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const existing = await db.logementReservation.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  }

  if (existing.statut === "traite") {
    return NextResponse.json({ error: "Cette demande de logement a déjà été traitée et ne peut plus être modifiée." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const { statut } = body;
  if (!["soumis", "en_cours_traitement", "correction_demandee", "traite"].includes(statut)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  const updated = await db.logementReservation.update({
    where: { id },
    data: { statut },
  });

  await logAudit({
    session: auth.session,
    action: "UPDATE",
    resource: "logement",
    resourceId: id,
    details: `Statut de la demande de logement changé en : ${statut} (${updated.prenom} ${updated.nom})`,
  });

  // Réveil instantané côté candidat
  void broadcastLogementLive({
    reservationId: id,
    candidatId: existing.candidatId,
    statut,
  });

  return NextResponse.json(updated);
}

// DELETE /api/admin/logement/[id] — suppression définitive d'une demande de logement
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiPermission("logement.write");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const existing = await db.logementReservation.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  }

  await db.logementReservation.delete({ where: { id } });
  await deleteUpload(existing.fichierPasseportUrl, "private");
  await deleteUpload(existing.fichierAttestationInscriptionUrl, "private");

  await logAudit({
    session: auth.session,
    action: "DELETE",
    resource: "logement",
    resourceId: id,
    details: `Demande de logement supprimée : ${existing.prenom} ${existing.nom}`,
  });

  return NextResponse.json({ success: true, id });
}
