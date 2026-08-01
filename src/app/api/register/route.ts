import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { registerSchema, validate } from "@/lib/validations";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";
import { isStaff } from "@/lib/rbac";
import { provisionAndSendEmailOtp } from "@/lib/supabase/send-otp";

/**
 * POST /api/register — crée le compte candidat (passwordHash),
 * provisionne Supabase Auth, envoie OTP / lien magique.
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
    const { prenom, nom, email, password, nationalite } = parsed.data;
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
          error: "Un compte existe déjà avec cet e-mail. Connectez-vous.",
          code: "ALREADY_REGISTERED",
        },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await db.user.create({
      data: {
        email: emailNorm,
        passwordHash,
        prenom: prenom.trim(),
        nom: nom.trim(),
        nationalite: nationalite || null,
        role: "CANDIDAT",
        actif: true,
        emailVerified: null,
        verifyToken: null,
      },
      select: { id: true, email: true, prenom: true, nom: true, role: true },
    });

    const origin = new URL(request.url).origin;
    const site = (process.env.NEXTAUTH_URL || origin).replace(/\/$/, "");
    const sent = await provisionAndSendEmailOtp({
      email: user.email,
      prismaUserId: user.id,
      meta: {
        prenom: user.prenom,
        nom: user.nom,
        nationalite,
      },
      redirectTo: `${site}/auth/callback`,
    });

    return NextResponse.json(
      {
        success: true,
        email: user.email,
        prenom: user.prenom,
        nom: user.nom,
        nationalite,
        user,
        emailSent: sent.ok,
        emailError: sent.ok ? undefined : sent.error,
        message: sent.ok
          ? "Compte créé. Vérifiez votre e-mail pour l'activer."
          : "Compte créé, mais l'e-mail de vérification n'a pas pu être envoyé.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
