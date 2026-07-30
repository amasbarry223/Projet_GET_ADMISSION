import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

// POST /api/register — inscription candidat
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prenom, nom, email, password, nationalite } = body;

    // Validation
    if (!prenom || !nom || !email || !password) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Le mot de passe doit contenir au moins 8 caractères" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "L'e-mail saisi n'est pas valide" }, { status: 400 });
    }

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
