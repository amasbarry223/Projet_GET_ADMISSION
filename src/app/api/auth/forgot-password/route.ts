import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";
import { sendMail, resetPasswordEmailHtml } from "@/lib/mail";
import { z } from "zod";
import { validate } from "@/lib/validations";

const requestSchema = z.object({
  email: z.string().email("E-mail invalide"),
});

const resetSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères").max(128),
});

// POST /api/auth/forgot-password — demande de reset (BF-08)
export async function POST(request: Request) {
  const rateLimited = checkRateLimit(getClientId(request), "/api/auth/forgot-password");
  if (rateLimited) return rateLimited;

  const body = await request.json().catch(() => null);
  const parsed = validate(requestSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const user = await db.user.findUnique({ where: { email } });

  // Toujours répondre OK (anti-énumération)
  if (!user || !user.actif) {
    return NextResponse.json({
      success: true,
      message: "Si un compte existe, un e-mail a été envoyé.",
    });
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1h

  await db.user.update({
    where: { id: user.id },
    data: { resetToken, resetTokenExpires },
  });

  const resetUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/reinitialiser-mot-de-passe?token=${resetToken}`;

  await sendMail({
    to: user.email,
    subject: "Réinitialisation du mot de passe — GET Admission",
    html: resetPasswordEmailHtml(user.prenom, resetUrl),
    text: `Réinitialisez votre mot de passe : ${resetUrl}`,
  });

  return NextResponse.json({
    success: true,
    message: "Si un compte existe, un e-mail a été envoyé.",
    // Mode démo : exposer le lien pour tests locaux
    ...(process.env.NODE_ENV !== "production" ? { resetUrl } : {}),
  });
}

// PUT /api/auth/forgot-password — appliquer le nouveau mot de passe
export async function PUT(request: Request) {
  const rateLimited = checkRateLimit(getClientId(request), "/api/auth/reset-password");
  if (rateLimited) return rateLimited;

  const body = await request.json().catch(() => null);
  const parsed = validate(resetSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { token, password } = parsed.data;
  const user = await db.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpires: { gt: new Date() },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Lien invalide ou expiré" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetToken: null,
      resetTokenExpires: null,
    },
  });

  return NextResponse.json({ success: true, message: "Mot de passe mis à jour. Vous pouvez vous connecter." });
}
