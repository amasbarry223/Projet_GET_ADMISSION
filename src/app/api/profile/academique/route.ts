import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { profilAcademiqueSchema, validate } from "@/lib/validations";
import { syncPiecesBrouillonsCandidat } from "@/lib/dossier/sync-pieces";

function serializeProfil(row: {
  id: string;
  userId: string;
  statutCandidat: string;
  classeActuelle: string | null;
  aObtenuBac: boolean;
  trimestresSeconde: number;
  trimestresPremiere: number;
  trimestresTerminale: number;
  attestationScolariteDisponible: boolean;
  niveauEtudesSuperieures: string;
  formationEnCours: boolean;
  diplomesObtenus: string;
  redoublements: string;
  interruptions: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  const parse = <T>(raw: string, fallback: T): T => {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  };
  return {
    ...row,
    diplomesObtenus: parse<string[]>(row.diplomesObtenus, []),
    redoublements: parse(row.redoublements, []),
    interruptions: parse(row.interruptions, []),
  };
}

// GET /api/profile/academique
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const profil = await db.profilAcademique.findUnique({ where: { userId } });
  if (!profil) {
    return NextResponse.json(null);
  }
  return NextResponse.json(serializeProfil(profil));
}

// PUT /api/profile/academique — upsert + sync pièces des brouillons
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role;
  if (role !== "CANDIDAT") {
    return NextResponse.json(
      { error: "Réservé aux candidats" },
      { status: 403 }
    );
  }

  const userId = (session.user as { id: string }).id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = validate(profilAcademiqueSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const data = parsed.data;
  const payload = {
    statutCandidat: data.statutCandidat,
    classeActuelle:
      data.classeActuelle ??
      (data.statutCandidat === "LYCEEN" ? "TERMINALE" : null),
    aObtenuBac: data.aObtenuBac ?? false,
    trimestresSeconde: data.trimestresSeconde ?? 3,
    trimestresPremiere: data.trimestresPremiere ?? 3,
    trimestresTerminale: data.trimestresTerminale ?? 2,
    attestationScolariteDisponible: data.attestationScolariteDisponible ?? false,
    niveauEtudesSuperieures: data.niveauEtudesSuperieures ?? "AUCUN",
    formationEnCours: data.formationEnCours ?? false,
    diplomesObtenus: JSON.stringify(data.diplomesObtenus ?? []),
    redoublements: JSON.stringify(data.redoublements ?? []),
    interruptions: JSON.stringify(data.interruptions ?? []),
  };

  const profil = await db.profilAcademique.upsert({
    where: { userId },
    create: { userId, ...payload },
    update: payload,
  });

  const syncResult = await syncPiecesBrouillonsCandidat(db, userId, {
    statutCandidat: profil.statutCandidat,
    classeActuelle: profil.classeActuelle,
    aObtenuBac: profil.aObtenuBac,
    trimestresSeconde: profil.trimestresSeconde,
    trimestresPremiere: profil.trimestresPremiere,
    trimestresTerminale: profil.trimestresTerminale,
    attestationScolariteDisponible: profil.attestationScolariteDisponible,
    niveauEtudesSuperieures: profil.niveauEtudesSuperieures,
    formationEnCours: profil.formationEnCours,
    diplomesObtenus: profil.diplomesObtenus,
    redoublements: profil.redoublements,
    interruptions: profil.interruptions,
  });

  return NextResponse.json({
    ...serializeProfil(profil),
    sync: {
      dossiers: syncResult.count,
      added: syncResult.added,
      removed: syncResult.removed,
    },
  });
}
