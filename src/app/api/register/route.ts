import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { registerSchema, validate } from "@/lib/validations";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";
import { isStaff } from "@/lib/rbac";

/**
 * POST /api/register — prépare l'inscription candidat OTP.
 * Ne crée pas encore le User Prisma (créé après verifyOtp).
 * Pas d'envoi Resend : le client envoie l'OTP via Supabase Auth.
 */
export async function POST(request: Request) {
  const rateLimited = checkRateLimit(getClientId(request), "/api/register");
  if (rateLimited) return rateLimited;

  try {
    const body = await request.json();
    const parsed = validate(registerSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { prenom, nom, email, nationalite } = parsed.data;
    const emailNorm = email.toLowerCase().trim();

    const existing = await db.user.findUnique({ where: { email: emailNorm } });
    if (existing) {
      if (isStaff(existing.role)) {
        return NextResponse.json(
          { error: "Un compte existe déjà avec cet e-mail" },
          { status: 409 },
        );
      }
      return NextResponse.json(
        {
          error: "Un compte existe déjà avec cet e-mail. Connectez-vous avec un code OTP.",
          code: "ALREADY_REGISTERED",
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      success: true,
      email: emailNorm,
      prenom,
      nom,
      nationalite,
      message: "Vous allez recevoir un code à 6 chiffres par e-mail.",
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
