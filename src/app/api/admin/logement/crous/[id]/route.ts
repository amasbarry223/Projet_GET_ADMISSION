import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiPermission, parseOrRespond } from "@/lib/api-auth";
import { demandeCrousSchema } from "@/lib/validations";
import { deleteUpload } from "@/lib/storage";
import { logAudit } from "@/lib/audit";
import { broadcastLogementLive } from "@/lib/logement/live-broadcast";

// GET /api/admin/logement/crous/[id] — détail d'une demande de logement CROUS (staff)
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiPermission("logement.read");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const demande = await db.demandeLogementCrous.findUnique({
    where: { id },
    include: { candidat: { select: { id: true, prenom: true, nom: true, email: true } } },
  });
  if (!demande) {
    return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  }
  return NextResponse.json(demande);
}

// PUT /api/admin/logement/crous/[id] — le staff modifie les informations d'une demande CROUS
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiPermission("logement.write");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const existing = await db.demandeLogementCrous.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = parseOrRespond(demandeCrousSchema, body);
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;

  const updated = await db.demandeLogementCrous.update({
    where: { id },
    data: {
      nom: input.nom,
      prenom: input.prenom,
      nomUsage: input.nomUsage || null,
      dateNaissance: input.dateNaissance,
      lieuNaissance: input.lieuNaissance,
      paysNaissance: input.paysNaissance,
      nationalite: input.nationalite,
      sexe: input.sexe,
      telephone: input.telephone,
      email: input.email,
      villeEtablissementFrance: input.villeEtablissementFrance,
    },
  });

  await logAudit({
    session: auth.session,
    action: "UPDATE",
    resource: "logement",
    resourceId: id,
    details: `Demande de logement CROUS modifiée : ${updated.prenom} ${updated.nom}`,
  });

  return NextResponse.json(updated);
}

// PATCH /api/admin/logement/crous/[id] — modification rapide du statut CROUS
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiPermission("logement.write");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const existing = await db.demandeLogementCrous.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const { statut } = body;
  if (!["soumis", "en_cours_traitement", "correction_demandee", "traite"].includes(statut)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  const updated = await db.demandeLogementCrous.update({
    where: { id },
    data: { statut },
  });

  await logAudit({
    session: auth.session,
    action: "UPDATE",
    resource: "logement",
    resourceId: id,
    details: `Statut de la demande CROUS changé en : ${statut} (${updated.prenom} ${updated.nom})`,
  });

  // Réveil instantané côté candidat
  void broadcastLogementLive({
    demandeId: id,
    candidatId: existing.candidatId,
    statut,
  });

  return NextResponse.json(updated);
}

// DELETE /api/admin/logement/crous/[id] — suppression définitive d'une demande CROUS
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiPermission("logement.write");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const existing = await db.demandeLogementCrous.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  }

  await db.demandeLogementCrous.delete({ where: { id } });
  await deleteUpload(existing.fichierPasseportRectoUrl, "private");
  await deleteUpload(existing.fichierPasseportVersoUrl, "private");
  await deleteUpload(existing.fichierAttestationAccordPrealableUrl, "private");

  await logAudit({
    session: auth.session,
    action: "DELETE",
    resource: "logement",
    resourceId: id,
    details: `Demande de logement CROUS supprimée : ${existing.prenom} ${existing.nom}`,
  });

  return NextResponse.json({ success: true, id });
}
