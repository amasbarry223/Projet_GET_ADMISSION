import { NextResponse } from "next/server";
import { parseOrRespond } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { otpRequestLoginSchema } from "@/lib/validations";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";
import { provisionAndSendEmailOtp } from "@/lib/supabase/send-otp";
import { API_ERROR_CODES, API_ROUTES } from "@/shared/constants";

export async function POST(request: Request) {
  const rateLimited = await checkRateLimit(
    getClientId(request),
    API_ROUTES.AUTH_SEND_VERIFICATION_OTP,
  );
  if (rateLimited) return rateLimited;

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
    }
    const parsed = parseOrRespond(otpRequestLoginSchema, body);
    if (!parsed.ok) return parsed.response;
    const email = parsed.data.email.toLowerCase().trim();

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
    const neutralResponse = {
      success: true as const,
      message: "Si un compte existe, un code de vérification a été envoyé.",
    };

    if (!user || user.role !== "CANDIDAT") {
      return NextResponse.json(neutralResponse);
    }
    if (!user.actif) {
      return NextResponse.json({ error: "Compte désactivé" }, { status: 403 });
    }
    if (user.emailVerified) {
      return NextResponse.json(
        {
          error: "Cet e-mail est déjà vérifié. Connectez-vous.",
          code: API_ERROR_CODES.ALREADY_VERIFIED,
        },
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
      const status = sent.code === API_ERROR_CODES.RATE_LIMIT ? 429 : 502;
      return NextResponse.json(
        {
          error: sent.error,
          code: sent.code,
          emailSent: false,
          ...(sent.retryAfterSec ? { retryAfterSec: sent.retryAfterSec } : {}),
        },
        {
          status,
          ...(sent.retryAfterSec
            ? { headers: { "Retry-After": String(sent.retryAfterSec) } }
            : {}),
        },
      );
    }

    return NextResponse.json({
      success: true,
      emailSent: true,
      email: user.email,
      message: "Un code de vérification a été envoyé à votre e-mail.",
    });
  } catch (error) {
    console.error("send-verification-otp error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
