import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/admin/transactions — liste des transactions (staff uniquement)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role === "CANDIDAT") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const transactions = await db.paiement.findMany({
    include: {
      candidat: { select: { prenom: true, nom: true } },
      dossier: { select: { reference: true } },
    },
    orderBy: { date: "desc" },
  });

  const result = transactions.map((t) => ({
    id: t.id,
    reference: t.reference,
    candidat: `${t.candidat.prenom} ${t.candidat.nom}`,
    dossier: t.dossier.reference,
    date: t.date.toISOString(),
    moyen: t.moyen,
    montant: t.montant,
    statut: t.statut,
    tranche: t.tranche,
  }));

  return NextResponse.json(result);
}
