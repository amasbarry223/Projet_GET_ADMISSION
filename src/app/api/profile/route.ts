import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/profile — profil complet de l'utilisateur connecté
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      prenom: true,
      nom: true,
      telephone: true,
      nationalite: true,
      dateNaissance: true,
      adresse: true,
      photoUrl: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
  }

  return NextResponse.json(user);
}

// PUT /api/profile — mise à jour du profil
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const body = await request.json();
  const { prenom, nom, telephone, nationalite, dateNaissance, adresse } = body;

  const updated = await db.user.update({
    where: { id: userId },
    data: {
      ...(prenom !== undefined && { prenom }),
      ...(nom !== undefined && { nom }),
      ...(telephone !== undefined && { telephone }),
      ...(nationalite !== undefined && { nationalite }),
      ...(dateNaissance !== undefined && { dateNaissance }),
      ...(adresse !== undefined && { adresse }),
    },
    select: { id: true, email: true, prenom: true, nom: true, telephone: true, nationalite: true, dateNaissance: true, adresse: true },
  });

  return NextResponse.json(updated);
}
