import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { logAudit } from "@/lib/audit";
import { sendMail, invitationEmailHtml } from "@/lib/mail";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";
import {
  canManageTargetUser,
  isInternalRole,
  isStaffManagementRole,
} from "@/lib/admin-users";

function generateTempPassword(length = 14): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@$%";
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return out;
}

type Ctx = { params: Promise<{ id: string }> };

/** POST — régénère un mot de passe temporaire et renvoie l'invitation. */
export async function POST(request: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role ?? "";
  if (!isStaffManagementRole(role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const rateLimited = await checkRateLimit(getClientId(request), "/api/admin/users/reset-password");
  if (rateLimited) return rateLimited;

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
          : "Un administrateur ne peut pas réinitialiser un super-administrateur",
      },
      { status: 403 },
    );
  }

  const defaultPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  await db.user.update({
    where: { id },
    data: { passwordHash, actif: true },
  });

  await sendMail({
    to: target.email,
    subject: "GET Admission — nouveau mot de passe temporaire",
    html: invitationEmailHtml(target.prenom, target.email, defaultPassword),
    text: `Bonjour ${target.prenom}, votre mot de passe a été réinitialisé. E-mail : ${target.email}. Mot de passe temporaire : ${defaultPassword}`,
  });

  await logAudit({
    session,
    action: "UPDATE",
    resource: "user",
    resourceId: id,
    details: `Mot de passe réinitialisé : ${target.email}`,
  });

  return NextResponse.json({
    success: true,
    email: target.email,
    defaultPassword,
  });
}
