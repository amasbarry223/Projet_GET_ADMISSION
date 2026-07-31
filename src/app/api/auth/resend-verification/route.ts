import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendMail, verificationEmailHtml } from "@/lib/mail";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";
import { createVerifyToken, isVerifyTokenExpired } from "@/lib/verify-token";

/**
 * POST /api/auth/resend-verification
 * Body: { email, dryRun?: boolean }
 * - dryRun: indique si le compte existe et attend une vérif (sans renvoyer)
 */
export async function POST(request: Request) {
  const rateLimited = checkRateLimit(getClientId(request), "/api/auth/resend-verification");
  if (rateLimited) return rateLimited;

  let body: { email?: string; dryRun?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const email = (body.email || "").toLowerCase().trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "E-mail invalide" }, { status: 400 });
  }

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
    if (body.dryRun) {
      return NextResponse.json({ needsVerification: false });
    }
    return NextResponse.json({
      success: true,
      message: "Si un compte existe, un e-mail a été envoyé.",
    });
  }

  if (user.emailVerified) {
    if (body.dryRun) {
      return NextResponse.json({ needsVerification: false });
    }
    return NextResponse.json({ error: "Cet e-mail est déjà vérifié." }, { status: 400 });
  }

  if (body.dryRun) {
    return NextResponse.json({ needsVerification: true }, { status: 409 });
  }

  // Toujours régénérer un token frais (TTL 48h)
  const verifyToken = createVerifyToken();
  await db.user.update({
    where: { id: user.id },
    data: { verifyToken },
  });

  const verifyUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/verify-email?token=${encodeURIComponent(verifyToken)}`;
  await sendMail({
    to: user.email,
    subject: "Vérifiez votre e-mail — GET Admission",
    html: verificationEmailHtml(user.prenom, verifyUrl),
  });

  return NextResponse.json({
    success: true,
    message: "E-mail de vérification renvoyé.",
    verifyUrl: process.env.NODE_ENV !== "production" ? verifyUrl : undefined,
  });
}
