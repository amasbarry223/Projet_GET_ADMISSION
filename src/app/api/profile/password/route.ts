import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { passwordChangeSchema } from "@/lib/validations";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";
import { requireApiUser, parseOrRespond } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";

// PUT /api/profile/password — changer son mot de passe
//
// Body: { currentPassword, newPassword }
// - Vérifie le mot de passe actuel avec bcrypt.compare
// - Hash le nouveau mot de passe et met à jour l'utilisateur
// - Rate limité à 5 / min / IP
export async function PUT(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;

  // Rate limiting (5 changements / min / IP)
  const rateLimited = await checkRateLimit(getClientId(request), "/api/profile/password");
  if (rateLimited) return rateLimited;

  const userId = auth.user.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = parseOrRespond(passwordChangeSchema, body);
  if (!parsed.ok) return parsed.response;
  const { currentPassword, newPassword } = parsed.data;

  // Récupérer le hash actuel
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
  }

  if (!user.passwordHash) {
    return NextResponse.json(
      {
        error:
          "Ce compte utilise la connexion par code OTP. Aucun mot de passe à modifier.",
      },
      { status: 400 },
    );
  }

  // Vérifier le mot de passe actuel
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json(
      { error: "Le mot de passe actuel est incorrect" },
      { status: 400 }
    );
  }

  // Refuser si le nouveau mot de passe est identique à l'actuel
  const sameAsCurrent = await bcrypt.compare(newPassword, user.passwordHash);
  if (sameAsCurrent) {
    return NextResponse.json(
      { error: "Le nouveau mot de passe doit être différent de l'actuel" },
      { status: 400 }
    );
  }

  // Hasher et mettre à jour
  const newPasswordHash = await bcrypt.hash(newPassword, 10);
  await db.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash },
  });

  await logAudit({
    session: auth.session,
    action: "UPDATE",
    resource: "user",
    resourceId: userId,
    details: "Mot de passe modifié",
  });

  return NextResponse.json({ success: true });
}
