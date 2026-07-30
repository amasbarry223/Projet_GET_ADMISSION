import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { registerSchema, validate } from "@/lib/validations";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";

// POST /api/register — inscription candidat
export async function POST(request: Request) {
  // Rate limiting (3 inscriptions / min / IP)
  const rateLimited = checkRateLimit(getClientId(request), "/api/register");
  if (rateLimited) return rateLimited;

  try {
    const body = await request.json();
    const parsed = validate(registerSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { prenom, nom, email, password, nationalite } = parsed.data;

    // Vérifier si l'email existe déjà
    const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: "Un compte existe déjà avec cet e-mail" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        prenom,
        nom,
        nationalite: nationalite || null,
        role: "CANDIDAT",
        actif: true,
      },
      select: { id: true, email: true, prenom: true, nom: true, role: true },
    });

    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
