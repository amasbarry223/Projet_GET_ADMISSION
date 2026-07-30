import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const revalidate = 3600;

// GET /api/public/modeles-attestation — modèles d'attestation actifs
export async function GET() {
  const modeles = await db.modeleAttestation.findMany({ where: { actif: true }, orderBy: { ordre: "asc" } });
  return NextResponse.json(modeles);
}

// POST /api/public/modeles-attestation — créer un modèle (staff uniquement)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const role = (session.user as any).role;
  if (role === "CANDIDAT") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await request.json();
  const { nom, description } = body;
  if (!nom) {
    return NextResponse.json({ error: "Le nom est requis" }, { status: 400 });
  }

  const maxOrdre = await db.modeleAttestation.aggregate({ _max: { ordre: true } });
  const modele = await db.modeleAttestation.create({
    data: {
      nom,
      description: description ?? "",
      ordre: (maxOrdre._max.ordre ?? 0) + 1,
    },
  });

  return NextResponse.json(modele, { status: 201 });
}
