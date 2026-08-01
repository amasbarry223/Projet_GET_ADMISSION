import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";
import { provisionAndSendEmailOtp } from "@/lib/supabase/send-otp";

/**
 * POST /api/auth/send-verification-otp
 * Body: { email }
 * Provisionne auth.users si besoin puis envoie le lien / OTP Supabase.
 */
export async function POST(request: Request) {
  const rateLimited = checkRateLimit(getClientId(request), "/api/auth/send-verification-otp");
  if (rateLimited) return rateLimited;

  try {
    const body = await request.json();
    const email = String(body?.email || "")
      .toLowerCase()
      .trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "E-mail invalide" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        prenom: true,
        nom: true,
        nationalite: true,
        role: true,
        actif: true,
        emailVerified: true,
      },
    });

    // Réponse neutre hors candidat (anti-énumération)
    const neutral = {
      success: true as const,
      message: "Si un compte existe, un e-mail de vérification a été envoyé.",
    };

    if (!user || user.role !== "CANDIDAT") {
      return NextResponse.json(neutral);
    }
    if (!user.actif) {
      return NextResponse.json({ error: "Compte désactivé" }, { status: 403 });
    }
    if (user.emailVerified) {
      return NextResponse.json(
        { error: "Cet e-mail est déjà vérifié. Connectez-vous.", code: "ALREADY_VERIFIED" },
        { status: 400 },
      );
    }

    const origin = new URL(request.url).origin;
    const site = (process.env.NEXTAUTH_URL || origin).replace(/\/$/, "");
    const redirectTo = `${site}/auth/callback`;

    const sent = await provisionAndSendEmailOtp({
      email: user.email,
      prismaUserId: user.id,
      meta: {
        prenom: user.prenom,
        nom: user.nom,
        nationalite: user.nationalite,
      },
      redirectTo,
    });

    if (!sent.ok) {
      const status = sent.code === "RATE_LIMIT" ? 429 : 502;
      return NextResponse.json(
        { error: sent.error, code: sent.code, emailSent: false },
        { status },
      );
    }

    return NextResponse.json({
      success: true,
      emailSent: true,
      email: user.email,
      message: "E-mail de vérification envoyé.",
    });
  } catch (error) {
    console.error("send-verification-otp error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
