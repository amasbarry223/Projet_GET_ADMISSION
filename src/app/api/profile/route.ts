import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { profileSchema, validate } from "@/lib/validations";
import { isCandidatProfileLocked } from "@/lib/dossier/candidat-lock";

// GET /api/profile — profil complet de l'utilisateur connecté
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = session.user.id;
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
      kycRectoPath: true,
      kycVersoPath: true,
      kycVerifie: true,
      kycVerifieLe: true,
      role: true,
      createdAt: true,
      profilAcademique: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
  }

  const locked =
    user.role === "CANDIDAT" ? await isCandidatProfileLocked(db, userId) : false;

  const profil = user.profilAcademique;
  return NextResponse.json({
    ...user,
    locked,
    profilAcademique: profil
      ? {
          ...profil,
          diplomesObtenus: (() => {
            try {
              return JSON.parse(profil.diplomesObtenus);
            } catch {
              return [];
            }
          })(),
          redoublements: (() => {
            try {
              return JSON.parse(profil.redoublements);
            } catch {
              return [];
            }
          })(),
          interruptions: (() => {
            try {
              return JSON.parse(profil.interruptions);
            } catch {
              return [];
            }
          })(),
        }
      : null,
  });
}

// PUT /api/profile — mise à jour du profil
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = session.user.id;

  if (session.user.role === "CANDIDAT" && (await isCandidatProfileLocked(db, userId))) {
    return NextResponse.json(
      { error: "Votre dossier est en cours de traitement — le profil ne peut plus être modifié." },
      { status: 403 },
    );
  }

  const body = await request.json();
  const parsed = validate(profileSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { prenom, nom, telephone, nationalite, dateNaissance, adresse } = parsed.data;
  // Champs KYC (optionnels)
  const kycType = body.kycType;
  const kycNumero = body.kycNumero;

  const current = await db.user.findUnique({
    where: { id: userId },
    select: { kycType: true, kycNumero: true, kycVerifie: true },
  });

  const kycIdentityChanged =
    (kycType !== undefined && kycType !== current?.kycType) ||
    (kycNumero !== undefined && kycNumero !== current?.kycNumero);

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
      // Changement d'identité KYC → révoquer la validation
      ...(kycIdentityChanged ? { kycVerifie: false, kycVerifieLe: null } : {}),
    },
    select: { id: true, email: true, prenom: true, nom: true, telephone: true, nationalite: true, dateNaissance: true, adresse: true, kycType: true, kycNumero: true, kycVerifie: true, kycVerifieLe: true },
  });

  return NextResponse.json(updated);
}
