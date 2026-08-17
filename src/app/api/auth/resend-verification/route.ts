import { NextResponse } from "next/server";
import { parseOrRespond } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { resendVerificationSchema } from "@/lib/validations";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";


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

  // Validation directe sans envoi de mail
  await db.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date(), verifyToken: null },
  });

  return NextResponse.json({
    success: true,
    emailSent: false,
    message: "Votre compte a été vérifié avec succès.",
  });
}
