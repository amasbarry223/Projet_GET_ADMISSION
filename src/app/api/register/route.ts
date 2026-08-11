import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { registerSchema, validate } from "@/lib/validations";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";
import { isStaff } from "@/lib/rbac";
import { createVerifyToken } from "@/lib/verify-token";
import { sendMail, verificationEmailHtml } from "@/lib/mail";

/**
 * POST /api/register — crée le compte candidat (passwordHash).
 * Si Parametre.exigerEmailVerifie : emailVerified reste null (BF-06) et mail de vérification envoyé.
 */
export async function POST(request: Request) {
  const rateLimited = await checkRateLimit(getClientId(request), "/api/register");
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

    const parametres = await db.parametre.findUnique({ where: { id: 1 } });
    const requireEmail = !!parametres?.exigerEmailVerifie;
    const verifyToken = requireEmail ? createVerifyToken() : null;

    const user = await db.user.create({
      data: {
        email: emailNorm,
        passwordHash,
        prenom: prenom.trim(),
        nom: nom.trim(),
        nationalite: nationalite || null,
        role: "CANDIDAT",
        actif: true,
        emailVerified: requireEmail ? null : new Date(),
        verifyToken,
      },
      select: { id: true, email: true, prenom: true, nom: true, role: true },
    });

    if (requireEmail && verifyToken) {
      const base = process.env.NEXTAUTH_URL || new URL(request.url).origin;
      const verifyUrl = `${base}/api/auth/verify-email?token=${encodeURIComponent(verifyToken)}`;
      try {
        await sendMail({
          to: user.email,
          subject: "Vérifiez votre e-mail — GET Admission",
          html: verificationEmailHtml(user.prenom, verifyUrl),
          text: `Bonjour ${user.prenom}, confirmez votre e-mail : ${verifyUrl}`,
        });
      } catch (e) {
        console.error("[register] Échec de l'envoi de l'e-mail de vérification:", e);
      }
    }

    return NextResponse.json(
      {
        success: true,
        email: user.email,
        prenom: user.prenom,
        nom: user.nom,
        nationalite,
        user,
        emailVerificationRequired: requireEmail,
        message: requireEmail
          ? "Compte créé. Vérifiez votre e-mail avant de vous connecter."
          : "Compte créé. Vous pouvez vous connecter.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
