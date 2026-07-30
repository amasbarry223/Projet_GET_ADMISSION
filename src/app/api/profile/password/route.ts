import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { passwordChangeSchema, validate } from "@/lib/validations";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";

// PUT /api/profile/password — changer son mot de passe
//
// Body: { currentPassword, newPassword }
// - Vérifie le mot de passe actuel avec bcrypt.compare
// - Hash le nouveau mot de passe et met à jour l'utilisateur
// - Rate limité à 5 / min / IP
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  // Rate limiting (5 changements / min / IP)
  const rateLimited = checkRateLimit(getClientId(request), "/api/profile/password");
  if (rateLimited) return rateLimited;

  const userId = (session.user as any).id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = validate(passwordChangeSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { currentPassword, newPassword } = parsed.data;

  // Récupérer le hash actuel
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
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

  return NextResponse.json({ success: true });
}
