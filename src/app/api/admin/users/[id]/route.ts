import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { adminUserUpdateSchema, validate } from "@/lib/validations";
import { logAudit } from "@/lib/audit";
import {
  canAssignRole,
  canManageTargetUser,
  isStaffManagementRole,
  staffManageDeniedMessage,
} from "@/lib/admin-users";

// PUT /api/admin/users/[id] — modifier un membre (CRUD)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const role = session.user.role ?? "";
  if (!isStaffManagementRole(role)) {
    return NextResponse.json(
      { error: "Seul un super-administrateur peut gérer le personnel" },
      { status: 403 },
    );
  }

  const userId = session.user.id;
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
      { error: staffManageDeniedMessage(role, target.role) },
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
  const { actif, role: newRole, prenom, nom, email, password } = parsed.data;

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
            ? "Seul un super-administrateur peut ajouter ou promouvoir un Super Admin"
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
    passwordHash?: string;
  } = {};
  if (actif !== undefined) data.actif = actif;
  if (newRole !== undefined) data.role = newRole;
  if (prenom !== undefined) data.prenom = prenom.trim();
  if (nom !== undefined) data.nom = nom.trim();
  if (email !== undefined) data.email = email.toLowerCase().trim();
  if (password) {
    data.passwordHash = await bcrypt.hash(password, 10);
  }

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
    details: `Utilisateur modifié : ${updated.email} (actif=${updated.actif}, role=${updated.role}${password ? ", mot de passe mis à jour" : ""})`,
  });

  return NextResponse.json(updated);
}

// DELETE /api/admin/users/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const role = session.user.role ?? "";
  if (!isStaffManagementRole(role)) {
    return NextResponse.json(
      { error: "Seul un super-administrateur peut gérer le personnel" },
      { status: 403 },
    );
  }

  const actorId = session.user.id;
  const { id } = await params;

  if (id === actorId) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas supprimer votre propre compte" },
      { status: 400 },
    );
  }

  const target = await db.user.findUnique({
    where: { id },
    select: { id: true, role: true, email: true },
  });
  if (!target) {
    return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
  }

  if (!canManageTargetUser(role, target.role)) {
    return NextResponse.json(
      { error: staffManageDeniedMessage(role, target.role) },
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

  try {
    // Suppression hard-delete en transaction :
    // 1. Détacher / réassigner toutes les FK pointant vers cet utilisateur
    // 2. Supprimer les entités propres à l'utilisateur (notifications, messages internes, conversation interne)
    // 3. Supprimer l'utilisateur
    await db.$transaction(async (tx) => {
      // Dossiers conseillés → détacher le conseiller (réattribuable ensuite)
      await tx.dossier.updateMany({
        where: { conseillerId: id },
        data: { conseillerId: null },
      });

      // Conversations de dossiers → détacher le conseiller
      await tx.conversation.updateMany({
        where: { conseillerId: id },
        data: { conseillerId: null },
      });

      // Historiques → détacher l'auteurId (le texte "auteur" reste dans le champ string)
      await tx.historique.updateMany({
        where: { auteurId: id },
        data: { auteurId: null },
      });

      // Attestations émises → réassigner à l'acteur qui effectue la suppression
      await tx.attestation.updateMany({
        where: { emetteurId: id },
        data: { emetteurId: actorId },
      });

      // Demandes de correction → réassigner au Super Admin acteur
      await tx.demandeCorrection.updateMany({
        where: { conseillerId: id },
        data: { conseillerId: actorId },
      });

      // Partages CROUS → réassigner au Super Admin acteur
      await tx.historiquePartageCrous.updateMany({
        where: { auteurId: id },
        data: { auteurId: actorId },
      });

      // Messagerie interne : supprimer les messages internes de cet auteur puis la conversation
      await tx.messageInterne.deleteMany({ where: { auteurId: id } });
      await tx.conversationInterne.deleteMany({ where: { financierId: id } });

      // Notifications propres à l'utilisateur
      await tx.notification.deleteMany({ where: { userId: id } });

      // Suppression définitive de l'utilisateur
      await tx.user.delete({ where: { id } });
    });

    await logAudit({
      session,
      action: "DELETE",
      resource: "user",
      resourceId: id,
      details: `Utilisateur supprimé définitivement : ${target.email} (${target.role}) — FK détachées/réassignées`,
    });

    return NextResponse.json({ success: true, softDeleted: false, id });
  } catch (err) {
    console.error("[DELETE /api/admin/users]", err);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la suppression. Veuillez réessayer." },
      { status: 500 },
    );
  }
}
