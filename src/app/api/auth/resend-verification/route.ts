import { NextResponse } from "next/server";
import { parseOrRespond } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { resendVerificationSchema } from "@/lib/validations";
import { sendMail, verificationEmailHtml } from "@/lib/mail";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";
import { createVerifyToken } from "@/lib/verify-token";

/**
 * POST /api/auth/resend-verification
 * Body: { email, dryRun?: boolean }
 * - dryRun: indique si le compte existe et attend une vérif (sans renvoyer)
 */
export async function POST(request: Request) {
  const rateLimited = await checkRateLimit(getClientId(request), "/api/auth/resend-verification");
  if (rateLimited) return rateLimited;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const parsed = parseOrRespond(resendVerificationSchema, raw);
  if (!parsed.ok) return parsed.response;
  const { email: emailRaw, dryRun } = parsed.data;
  const email = emailRaw.toLowerCase().trim();

  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      prenom: true,
      email: true,
      emailVerified: true,
      role: true,
      verifyToken: true,
    },
  });

  // Ne pas révéler si l'e-mail n'existe pas (sauf dryRun pour UX login)
  if (!user) {
    if (dryRun) {
      return NextResponse.json({ needsVerification: false });
    }
    return NextResponse.json({
      success: true,
      emailSent: true,
      message: "Si un compte existe, un e-mail a été envoyé.",
    });
  }

  if (user.emailVerified) {
    if (dryRun) {
      return NextResponse.json({ needsVerification: false });
    }
    return NextResponse.json({ error: "Cet e-mail est déjà vérifié." }, { status: 400 });
  }

  if (dryRun) {
    return NextResponse.json({ needsVerification: true }, { status: 409 });
  }

  // Toujours régénérer un token frais (TTL 48h)
  const verifyToken = createVerifyToken();
  await db.user.update({
    where: { id: user.id },
    data: { verifyToken },
  });

  const verifyUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/verify-email?token=${encodeURIComponent(verifyToken)}`;
  const mail = await sendMail({
    to: user.email,
    subject: "Vérifiez votre e-mail — GET Admission",
    html: verificationEmailHtml(user.prenom, verifyUrl),
    text: `Bonjour ${user.prenom}, confirmez votre e-mail : ${verifyUrl}`,
  });

  if (!mail.ok) {
    return NextResponse.json(
      {
        error: mail.error || "Impossible d'envoyer l'e-mail de vérification. Réessayez plus tard.",
        emailSent: false,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    emailSent: true,
    message: "E-mail de vérification renvoyé.",
    verifyUrl: process.env.NODE_ENV !== "production" ? verifyUrl : undefined,
  });
}
