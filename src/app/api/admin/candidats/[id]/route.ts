import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiPermission, parseOrRespond } from "@/lib/api-auth";
import { adminCandidatUpdateSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";

// PUT /api/admin/candidats/[id] — modifier un candidat (Admin/Super Admin)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiPermission("candidats.write");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const target = await db.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true },
  });
  if (!target || target.role !== "CANDIDAT") {
    return NextResponse.json({ error: "Candidat non trouvé" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = parseOrRespond(adminCandidatUpdateSchema, body);
  if (!parsed.ok) return parsed.response;
  const { prenom, nom, email, telephone, nationalite, actif } = parsed.data;

  if (email) {
    const normalizedEmail = email.toLowerCase().trim();
    if (normalizedEmail !== target.email) {
      const clash = await db.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
      if (clash) {
        return NextResponse.json({ error: "Un compte existe déjà avec cet e-mail" }, { status: 409 });
      }
    }
  }

  if (actif === false) {
    const assigned = await db.dossier.findFirst({
      where: { candidatId: id, conseillerId: { not: null } },
      include: { conseiller: { select: { prenom: true, nom: true } } },
    });
    if (assigned?.conseiller) {
      return NextResponse.json(
        {
          error: `Désactivation impossible : ce candidat est affecté au conseiller ${assigned.conseiller.prenom} ${assigned.conseiller.nom}. L'admin ou super admin n'a plus la main pour le désactiver.`,
        },
        { status: 403 },
      );
    }
  }

  const data: Record<string, unknown> = {};
  if (prenom !== undefined) data.prenom = prenom.trim();
  if (nom !== undefined) data.nom = nom.trim();
  if (email !== undefined) data.email = email.toLowerCase().trim();
  if (telephone !== undefined) data.telephone = telephone;
  if (nationalite !== undefined) data.nationalite = nationalite;
  if (actif !== undefined) data.actif = actif;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Aucune modification fournie" }, { status: 400 });
  }

  const updated = await db.user.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      prenom: true,
      nom: true,
      telephone: true,
      nationalite: true,
      actif: true,
    },
  });

  await logAudit({
    session: auth.session,
    action: "UPDATE",
    resource: "user",
    resourceId: id,
    details: `Candidat modifié : ${updated.email}`,
  });

  return NextResponse.json(updated);
}

// DELETE /api/admin/candidats/[id] — supprimer un candidat (bloqué si dossier affecté à un conseiller)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiPermission("candidats.write");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const target = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });
  if (!target || target.role !== "CANDIDAT") {
    return NextResponse.json({ error: "Candidat non trouvé" }, { status: 404 });
  }

  const assignedDossier = await db.dossier.findFirst({
    where: { candidatId: id, conseillerId: { not: null } },
    include: { conseiller: { select: { prenom: true, nom: true } } },
  });

  if (assignedDossier?.conseiller) {
    return NextResponse.json(
      {
        error: `Suppression impossible : le dossier du candidat est affecté au conseiller ${assignedDossier.conseiller.prenom} ${assignedDossier.conseiller.nom}. L'admin ou super admin n'a plus la possibilité de le supprimer.`,
      },
      { status: 403 },
    );
  }

  await db.$transaction(async (tx) => {
    await tx.paiement.deleteMany({ where: { candidatId: id } });
    await tx.piece.deleteMany({ where: { dossier: { candidatId: id } } });
    await tx.historique.deleteMany({ where: { dossier: { candidatId: id } } });
    await tx.dossier.deleteMany({ where: { candidatId: id } });
    await tx.message.deleteMany({ where: { auteurId: id } });
    await tx.demandeLogementCrous.deleteMany({ where: { candidatId: id } });
    await tx.logementReservation.deleteMany({ where: { candidatId: id } });
    await tx.profilAcademique.deleteMany({ where: { userId: id } });
    await tx.user.delete({ where: { id } });
  });

  await logAudit({
    session: auth.session,
    action: "DELETE",
    resource: "user",
    resourceId: id,
    details: `Candidat supprimé : ${target.email}`,
  });

  return NextResponse.json({ success: true, softDeleted: false, id });
}
