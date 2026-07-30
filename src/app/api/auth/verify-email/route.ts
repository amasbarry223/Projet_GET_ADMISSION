import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/auth/verify-email?token=xxx — vérifie l'e-mail d'un candidat (BF-06)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token manquant" }, { status: 400 });
  }

  const user = await db.user.findFirst({
    where: { verifyToken: token },
    select: { id: true, email: true, emailVerified: true },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Token invalide ou expiré." },
      { status: 404 }
    );
  }

  if (user.emailVerified) {
    return NextResponse.json({ success: true, message: "E-mail déjà vérifié." });
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      emailVerified: new Date(),
      verifyToken: null,
    },
  });

  return NextResponse.json({
    success: true,
    message: "E-mail vérifié avec succès. Vous pouvez vous connecter.",
    email: user.email,
  });
}
