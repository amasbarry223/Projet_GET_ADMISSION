import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

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
