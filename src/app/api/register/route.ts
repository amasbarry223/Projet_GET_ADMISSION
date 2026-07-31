import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { registerSchema, validate } from "@/lib/validations";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";
import { sendMail, verificationEmailHtml } from "@/lib/mail";
import { createVerifyToken } from "@/lib/verify-token";

// POST /api/register — inscription candidat (BF-06)
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

    const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: "Un compte existe déjà avec cet e-mail" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const verifyToken = createVerifyToken();

    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        prenom,
        nom,
        nationalite: nationalite || null,
        role: "CANDIDAT",
        actif: true,
        verifyToken,
        emailVerified: null,
      },
      select: { id: true, email: true, prenom: true, nom: true, role: true, verifyToken: true },
    });

    const verifyUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/verify-email?token=${encodeURIComponent(verifyToken)}`;

    await sendMail({
      to: user.email,
      subject: "Vérifiez votre e-mail — GET Admission",
      html: verificationEmailHtml(user.prenom, verifyUrl),
      text: `Bonjour ${user.prenom}, confirmez votre e-mail : ${verifyUrl}`,
    });

    return NextResponse.json(
      {
        success: true,
        user: { id: user.id, email: user.email, prenom: user.prenom, nom: user.nom, role: user.role },
        ...(process.env.NODE_ENV !== "production" ? { verifyUrl } : {}),
        message: "Compte créé. Un e-mail de vérification a été envoyé.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
