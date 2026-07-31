import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isVerifyTokenExpired } from "@/lib/verify-token";

function redirectTo(status: "ok" | "error" | "already", message: string, request: Request) {
  const base = process.env.NEXTAUTH_URL || new URL(request.url).origin;
  const url = new URL("/verification-email", base);
  url.searchParams.set("status", status);
  url.searchParams.set("message", message);
  return NextResponse.redirect(url);
}

// GET /api/auth/verify-email?token=xxx — vérifie puis redirige vers page UI (BF-06)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return redirectTo("error", "Lien de vérification invalide (token manquant).", request);
  }

  if (isVerifyTokenExpired(token)) {
    return redirectTo(
      "error",
      "Lien expiré (valable 48 h). Demandez un nouvel e-mail depuis la page de vérification ou la connexion.",
      request
    );
  }

  const user = await db.user.findFirst({
    where: { verifyToken: token },
    select: { id: true, email: true, emailVerified: true },
  });

  if (!user) {
    return redirectTo(
      "error",
      "Lien invalide ou déjà utilisé. Vous pouvez demander un nouvel e-mail depuis la page de vérification ou la connexion.",
      request
    );
  }

  if (user.emailVerified) {
    return redirectTo("already", "Votre e-mail est déjà vérifié. Vous pouvez vous connecter.", request);
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      emailVerified: new Date(),
      verifyToken: null,
    },
  });

  return redirectTo("ok", "E-mail vérifié avec succès. Vous pouvez vous connecter.", request);
}
