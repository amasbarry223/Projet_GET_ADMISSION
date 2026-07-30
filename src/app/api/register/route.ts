import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "@/lib/db";
import { registerSchema, validate } from "@/lib/validations";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";

// POST /api/register — inscription candidat (BF-06)
// Génère un token de vérification e-mail. L'utilisateur doit cliquer sur le lien
// envoyé par e-mail pour activer son compte.
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
    const verifyToken = crypto.randomBytes(32).toString("hex");

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

    // En production : envoyer un e-mail avec le lien de vérification
    // const verifyUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${verifyToken}`;
    // await sendEmail(user.email, "Vérifiez votre e-mail — GET Admission", ...);
    // En démo : on retourne le lien dans la réponse pour que l'UI puisse l'afficher
    const verifyUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/verify-email?token=${verifyToken}`;

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, prenom: user.prenom, nom: user.nom, role: user.role },
      verifyUrl,
      message: "Compte créé. Un e-mail de vérification a été envoyé.",
    }, { status: 201 });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
