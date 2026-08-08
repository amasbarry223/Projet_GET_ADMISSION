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

// DELETE /api/admin/candidats/[id] — supprimer (ou désactiver si dossiers liés) un candidat
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
      _count: {
        select: {
          dossiersCandidat: true,
          messages: true,
          conversationsCandidat: true,
          logementReservations: true,
          demandesLogementCrous: true,
        },
      },
    },
  });
  if (!target || target.role !== "CANDIDAT") {
    return NextResponse.json({ error: "Candidat non trouvé" }, { status: 404 });
  }

  // Réservations logement/CROUS : indépendantes de Dossier (un candidat peut en avoir sans
  // jamais créer de dossier d'admission) et en cascade dure en base — un candidat n'ayant que
  // ce type de données déclenchait auparavant une suppression définitive silencieuse au lieu
  // du soft-delete prévu.
  const hasRelations =
    target._count.dossiersCandidat > 0 ||
    target._count.messages > 0 ||
    target._count.conversationsCandidat > 0 ||
    target._count.logementReservations > 0 ||
    target._count.demandesLogementCrous > 0;

  if (hasRelations) {
    const updated = await db.user.update({
      where: { id },
      data: { actif: false },
      select: { id: true, actif: true },
    });

    await logAudit({
      session: auth.session,
      action: "DELETE",
      resource: "user",
      resourceId: id,
      details: `Candidat désactivé (soft-delete, dossiers liés) : ${target.email}`,
    });

    return NextResponse.json({
      success: true,
      softDeleted: true,
      message: "Compte désactivé (des dossiers/messages sont liés à ce candidat)",
      user: updated,
    });
  }

  await db.user.delete({ where: { id } });

  await logAudit({
    session: auth.session,
    action: "DELETE",
    resource: "user",
    resourceId: id,
    details: `Candidat supprimé : ${target.email}`,
  });

  return NextResponse.json({ success: true, softDeleted: false, id });
}
