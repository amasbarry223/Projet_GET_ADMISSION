import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * POST /api/paiements/verify
 * Vérifie simplement le statut d'un paiement en base (sans auto-validation en ligne).
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: { reference?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const userId = session.user.id;
  const { reference } = body;

  const paiement = await db.paiement.findFirst({
    where: {
      candidatId: userId,
      ...(reference ? { reference } : {}),
    },
    include: {
      dossier: {
        include: { candidat: { select: { email: true, prenom: true } } },
      },
    },
    orderBy: { date: "desc" },
  });

  if (!paiement) {
    return NextResponse.json({ error: "Aucun paiement trouvé" }, { status: 404 });
  }

  return NextResponse.json({
    success: paiement.statut === "reussi",
    statut: paiement.statut,
    paiement,
    receiptUrl: paiement.statut === "reussi" ? `/api/recu/${paiement.id}?format=pdf` : null,
  });
}
