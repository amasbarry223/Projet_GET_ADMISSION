import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { adminUserUpdateSchema, validate } from "@/lib/validations";
import { logAudit } from "@/lib/audit";
import {
  canAssignRole,
  canManageTargetUser,
  isInternalRole,
  isStaffManagementRole,
} from "@/lib/admin-users";

// PUT /api/admin/users/[id] — modifier un membre (CRUD)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role ?? "";
  if (!isStaffManagementRole(role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  const target = await db.user.findUnique({
    where: { id },
    select: { id: true, email: true, prenom: true, nom: true, role: true, actif: true },
  });
  if (!target) {
    return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
  }

  if (!canManageTargetUser(role, target.role)) {
    return NextResponse.json(
      {
        error: !isInternalRole(target.role)
          ? "Les comptes candidats se gèrent hors de la page Personnel"
          : "Un administrateur ne peut pas modifier un super-administrateur",
      },
      { status: 403 },
    );
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
  const { actif, role: newRole, prenom, nom, email } = parsed.data;

  if (actif === false && id === userId) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas désactiver votre propre compte" },
      { status: 400 },
    );
  }

  if (newRole !== undefined && !canAssignRole(role, newRole)) {
    return NextResponse.json(
      {
        error:
          newRole === "SUPER_ADMIN"
            ? "Seul un super-administrateur peut promouvoir au rang super-administrateur"
            : "Vous n'êtes pas autorisé à attribuer ce rôle",
      },
      { status: 403 },
    );
  }

  if (target.role === "SUPER_ADMIN" && newRole !== undefined && newRole !== "SUPER_ADMIN") {
    const superAdminCount = await db.user.count({
      where: { role: "SUPER_ADMIN", actif: true },
    });
    if (superAdminCount <= 1) {
      return NextResponse.json(
        { error: "Impossible de rétrograder le dernier super-administrateur actif" },
        { status: 400 },
      );
    }
  }

  if (email) {
    const normalizedEmail = email.toLowerCase().trim();
    if (normalizedEmail !== target.email) {
      const clash = await db.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true },
      });
      if (clash) {
        return NextResponse.json(
          { error: "Un compte existe déjà avec cet e-mail" },
          { status: 409 },
        );
      }
    }
  }

  const data: {
    actif?: boolean;
    role?: NonNullable<typeof newRole>;
    prenom?: string;
    nom?: string;
    email?: string;
  } = {};
  if (actif !== undefined) data.actif = actif;
  if (newRole !== undefined) data.role = newRole;
  if (prenom !== undefined) data.prenom = prenom.trim();
  if (nom !== undefined) data.nom = nom.trim();
  if (email !== undefined) data.email = email.toLowerCase().trim();

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
      role: true,
      actif: true,
      createdAt: true,
    },
  });

  await logAudit({
    session,
    action: "UPDATE",
    resource: "user",
    resourceId: id,
    details: `Utilisateur modifié : ${updated.email} (actif=${updated.actif}, role=${updated.role})`,
  });

  return NextResponse.json(updated);
}

// DELETE /api/admin/users/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role ?? "";
  if (!isStaffManagementRole(role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  if (id === userId) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas supprimer votre propre compte" },
      { status: 400 },
    );
  }

  const target = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      role: true,
      email: true,
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

  if (!canManageTargetUser(role, target.role)) {
    return NextResponse.json(
      {
        error: !isInternalRole(target.role)
          ? "Les comptes candidats se gèrent hors de la page Personnel"
          : "Un administrateur ne peut pas supprimer un super-administrateur",
      },
      { status: 403 },
    );
  }

  if (target.role === "SUPER_ADMIN") {
    const superAdminCount = await db.user.count({
      where: { role: "SUPER_ADMIN", actif: true },
    });
    if (superAdminCount <= 1) {
      return NextResponse.json(
        { error: "Impossible de supprimer le dernier super-administrateur" },
        { status: 400 },
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
    const updated = await db.user.update({
      where: { id },
      data: { actif: false },
      select: { id: true, actif: true },
    });

    await logAudit({
      session,
      action: "DELETE",
      resource: "user",
      resourceId: id,
      details: `Utilisateur désactivé (soft-delete) : ${target.email} (${target.role})`,
    });

    return NextResponse.json({
      success: true,
      softDeleted: true,
      message: "Compte désactivé (des données sont liées à cet utilisateur)",
      user: updated,
    });
  }

  await db.user.delete({ where: { id } });

  await logAudit({
    session,
    action: "DELETE",
    resource: "user",
    resourceId: id,
    details: `Utilisateur supprimé : ${target.email} (${target.role})`,
  });

  return NextResponse.json({ success: true, softDeleted: false, id });
}
