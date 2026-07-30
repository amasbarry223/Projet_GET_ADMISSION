import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { pieceSchema, validate } from "@/lib/validations";

// POST /api/dossiers/[id]/pieces — créer ou mettre à jour une pièce
//
// Body: { libelle, statut, type?, nomFichier?, taille? }
// - Si une pièce avec ce libellé existe déjà pour ce dossier → update
// - Sinon → create
//
// RBAC : candidat propriétaire du dossier OU staff
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  const dossier = await db.dossier.findUnique({
    where: { id },
    select: { id: true, candidatId: true, reference: true },
  });
  if (!dossier) {
    return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
  }

  // RBAC : candidat ne modifie que son dossier
  if (role === "CANDIDAT" && dossier.candidatId !== userId) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = validate(pieceSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { libelle, statut, type, nomFichier, taille } = parsed.data;

  // Cherche une pièce existante avec ce libellé
  const existing = await db.piece.findFirst({
    where: { dossierId: id, libelle },
  });

  const televerseeLe = statut === "televersee" || statut === "validee" ? new Date() : undefined;

  let piece;
  if (existing) {
    piece = await db.piece.update({
      where: { id: existing.id },
      data: {
        statut,
        ...(type ? { type } : {}),
        ...(nomFichier !== undefined ? { nomFichier } : {}),
        ...(taille !== undefined ? { taille } : {}),
        ...(televerseeLe ? { televerseeLe } : {}),
      },
    });
  } else {
    piece = await db.piece.create({
      data: {
        dossierId: id,
        libelle,
        statut,
        type: type ?? "pdf",
        nomFichier: nomFichier ?? null,
        taille: taille ?? null,
        televerseeLe: televerseeLe ?? null,
      },
    });
  }

  // Historique
  await db.historique.create({
    data: {
      dossierId: id,
      etat: "VERIFICATION",
      auteur: `${(session.user as any).prenom} ${(session.user as any).nom}`,
      auteurId: userId,
      note: `Pièce « ${libelle} » → ${statut.replace(/_/g, " ").toLowerCase()}`,
    },
  });

  return NextResponse.json(piece, { status: existing ? 200 : 201 });
}

// GET /api/dossiers/[id]/pieces — liste des pièces d'un dossier
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  const dossier = await db.dossier.findUnique({
    where: { id },
    select: { candidatId: true },
  });
  if (!dossier) {
    return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
  }

  if (role === "CANDIDAT" && dossier.candidatId !== userId) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const pieces = await db.piece.findMany({
    where: { dossierId: id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(pieces);
}
