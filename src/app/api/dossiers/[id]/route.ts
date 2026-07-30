import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { dossierUpdateSchema, validate } from "@/lib/validations";

// GET /api/dossiers/[id] — détail (candidat propriétaire ou staff)
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
    include: {
      candidat: { select: { id: true, prenom: true, nom: true, email: true, nationalite: true, telephone: true } },
      universite: true,
      formation: true,
      conseiller: { select: { id: true, prenom: true, nom: true } },
      pieces: true,
      paiements: true,
      historiques: { orderBy: { date: "asc" } },
      conversation: { include: { messages: { orderBy: { createdAt: "asc" } } } },
    },
  });

  if (!dossier) {
    return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
  }

  // RBAC : candidat ne voit que son dossier
  if (role === "CANDIDAT" && dossier.candidatId !== userId) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  // Parse JSON fields
  const result = {
    ...dossier,
    universite: {
      ...dossier.universite,
      domaines: JSON.parse(dossier.universite.domaines),
      pointsForts: JSON.parse(dossier.universite.pointsForts),
    },
    formation: {
      ...dossier.formation,
      prerequis: JSON.parse(dossier.formation.prerequis),
      piecesRequises: JSON.parse(dossier.formation.piecesRequises),
    },
  };

  return NextResponse.json(result);
}

// PUT /api/dossiers/[id] — mettre à jour un dossier
//
// Body (tous champs optionnels) :
// - etapeActuelle?: number (1-12)
// - info?: { prenom, nom, telephone, nationalite, dateNaissance, adresse }  → met à jour le candidat
// - pieces?: [{ libelle, statut }]  → met à jour le statut des pièces existantes (par libellé)
//
// RBAC : candidat propriétaire du dossier OU staff (non CANDIDAT)
export async function PUT(
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

  const parsed = validate(dossierUpdateSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { etapeActuelle, info, pieces } = parsed.data;

  const auteurLabel = `${(session.user as any).prenom} ${(session.user as any).nom}`;

  // Transaction : update dossier + update user + update pieces + historique
  const updated = await db.$transaction(async (tx) => {
    const notes: string[] = [];

    // 1) Mise à jour des infos personnelles du candidat (sur le User lié)
    if (info) {
      const data: Record<string, string> = {};
      if (info.prenom !== undefined) data.prenom = info.prenom;
      if (info.nom !== undefined) data.nom = info.nom;
      if (info.telephone !== undefined) data.telephone = info.telephone;
      if (info.nationalite !== undefined) data.nationalite = info.nationalite;
      if (info.dateNaissance !== undefined) data.dateNaissance = info.dateNaissance;
      if (info.adresse !== undefined) data.adresse = info.adresse;
      if (Object.keys(data).length > 0) {
        await tx.user.update({ where: { id: dossier.candidatId }, data });
        notes.push("Informations personnelles mises à jour");
      }
    }

    // 2) Mise à jour des pièces (par libellé)
    if (pieces && pieces.length > 0) {
      for (const p of pieces) {
        await tx.piece.updateMany({
          where: { dossierId: id, libelle: p.libelle },
          data: {
            statut: p.statut,
            ...(p.statut === "televersee" ? { televerseeLe: new Date() } : {}),
          },
        });
      }
      notes.push(`${pieces.length} pièce(s) mise(s) à jour`);
    }

    // 3) Mise à jour de l'étape courante
    if (etapeActuelle !== undefined) {
      await tx.dossier.update({
        where: { id },
        data: { etapeActuelle },
      });
      notes.push(`Étape passée à ${etapeActuelle}`);
    }

    // 4) Historique (seulement s'il y a eu des changements)
    if (notes.length > 0) {
      await tx.historique.create({
        data: {
          dossierId: id,
          etat: "SOUMIS", // l'état courant réel est conservé, on log juste l'update
          auteur: auteurLabel,
          auteurId: userId,
          note: notes.join(" · "),
        },
      });
    }

    return tx.dossier.findUnique({
      where: { id },
      include: {
        candidat: { select: { id: true, prenom: true, nom: true, email: true, nationalite: true, telephone: true, dateNaissance: true, adresse: true } },
        universite: true,
        formation: true,
        pieces: true,
        historiques: { orderBy: { date: "asc" } },
      },
    });
  });

  return NextResponse.json(updated);
}
