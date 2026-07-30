import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { profileSchema, validate } from "@/lib/validations";

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
      kycType: true,
      kycNumero: true,
      kycVerifie: true,
      kycVerifieLe: true,
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
  const parsed = validate(profileSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { prenom, nom, telephone, nationalite, dateNaissance, adresse } = parsed.data;
  // Champs KYC (optionnels)
  const kycType = body.kycType;
  const kycNumero = body.kycNumero;

  const updated = await db.user.update({
    where: { id: userId },
    data: {
      ...(prenom !== undefined && { prenom }),
      ...(nom !== undefined && { nom }),
      ...(telephone !== undefined && { telephone }),
      ...(nationalite !== undefined && { nationalite }),
      ...(dateNaissance !== undefined && { dateNaissance }),
      ...(adresse !== undefined && { adresse }),
      ...(kycType !== undefined && { kycType }),
      ...(kycNumero !== undefined && { kycNumero }),
    },
    select: { id: true, email: true, prenom: true, nom: true, telephone: true, nationalite: true, dateNaissance: true, adresse: true, kycType: true, kycNumero: true, kycVerifie: true, kycVerifieLe: true },
  });

  return NextResponse.json(updated);
}
