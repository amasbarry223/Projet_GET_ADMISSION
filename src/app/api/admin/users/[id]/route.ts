import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { adminUserUpdateSchema, validate } from "@/lib/validations";

// PUT /api/admin/users/[id] — modifier un utilisateur (admin uniquement)
//
// Body: { actif?, role? }
// - Toggle actif (activer/désactiver) ou changer le rôle
// - Un SUPER_ADMIN ne peut pas être désactivé ou rétrogradé par un ADMIN simple
// - On ne peut pas se désactiver soi-même
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const userId = (session.user as any).id;
  const { id } = await params;

  const target = await db.user.findUnique({
    where: { id },
    select: { id: true, email: true, prenom: true, nom: true, role: true, actif: true },
  });
  if (!target) {
    return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = validate(adminUserUpdateSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { actif, role: newRole } = parsed.data;

  // Ne pas se désactiver soi-même
  if (actif === false && id === userId) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas désactiver votre propre compte" },
      { status: 400 }
    );
  }

  // Protection SUPER_ADMIN : seul un SUPER_ADMIN peut modifier un SUPER_ADMIN
  if (target.role === "SUPER_ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Seul un super-administrateur peut modifier un autre super-administrateur" },
      { status: 403 }
    );
  }

  // Un ADMIN non-SUPER_ADMIN ne peut pas promouvoir au rang SUPER_ADMIN
  if (newRole === "SUPER_ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Seul un super-administrateur peut promouvoir au rang super-administrateur" },
      { status: 403 }
    );
  }

  // Ne pas rétrograder le dernier SUPER_ADMIN restant
  if (
    target.role === "SUPER_ADMIN" &&
    newRole !== undefined &&
    newRole !== "SUPER_ADMIN"
  ) {
    const superAdminCount = await db.user.count({
      where: { role: "SUPER_ADMIN", actif: true },
    });
    if (superAdminCount <= 1) {
      return NextResponse.json(
        { error: "Impossible de rétrograder le dernier super-administrateur actif" },
        { status: 400 }
      );
    }
  }

  const data: { actif?: boolean; role?: typeof newRole } = {};
  if (actif !== undefined) data.actif = actif;
  if (newRole !== undefined) data.role = newRole;

  const updated = await db.user.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      prenom: true,
      nom: true,
      role: true,
      actif: true,
      createdAt: true,
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/admin/users/[id] — supprimer un utilisateur (admin uniquement)
// Soft-delete par défaut (set actif=false) si l'utilisateur a des dossiers/messages.
// Hard delete sinon.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const userId = (session.user as any).id;
  const { id } = await params;

  if (id === userId) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas supprimer votre propre compte" },
      { status: 400 }
    );
  }

  const target = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      role: true,
      actif: true,
      _count: {
        select: {
          dossiersCandidat: true,
          dossiersConseiller: true,
          messages: true,
          historiquesAuteur: true,
          attestationsEmises: true,
          conversationsCandidat: true,
          conversationsConseiller: true,
          paiements: true,
        },
      },
    },
  });
  if (!target) {
    return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
  }

  // Protection SUPER_ADMIN
  if (target.role === "SUPER_ADMIN" && role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Seul un super-administrateur peut supprimer un autre super-administrateur" },
      { status: 403 }
    );
  }

  // Ne pas supprimer le dernier SUPER_ADMIN
  if (target.role === "SUPER_ADMIN") {
    const superAdminCount = await db.user.count({
      where: { role: "SUPER_ADMIN", actif: true },
    });
    if (superAdminCount <= 1) {
      return NextResponse.json(
        { error: "Impossible de supprimer le dernier super-administrateur" },
        { status: 400 }
      );
    }
  }

  const hasRelations =
    target._count.dossiersCandidat > 0 ||
    target._count.dossiersConseiller > 0 ||
    target._count.messages > 0 ||
    target._count.historiquesAuteur > 0 ||
    target._count.attestationsEmises > 0 ||
    target._count.conversationsCandidat > 0 ||
    target._count.conversationsConseiller > 0 ||
    target._count.paiements > 0;

  if (hasRelations) {
    // Soft-delete : désactiver le compte
    const updated = await db.user.update({
      where: { id },
      data: { actif: false },
      select: { id: true, actif: true },
    });
    return NextResponse.json({
      success: true,
      softDeleted: true,
      message: "Compte désactivé (des données sont liées à cet utilisateur)",
      user: updated,
    });
  }

  // Hard delete
  await db.user.delete({ where: { id } });
  return NextResponse.json({ success: true, softDeleted: false, id });
}
