import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/admin/transactions — liste des transactions (staff uniquement)
//
// Comportement de pagination (backward compatible) :
// - Sans `?page=`      → renvoie un tableau plat (legacy).
// - Avec `?page=N`      → renvoie { data, total, page, pageSize }.
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role === "CANDIDAT") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  // --- Params de pagination (optionnels) ---
  const { searchParams } = new URL(request.url);
  const hasPagination = searchParams.has("page");
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? "20")));

  const orderBy = { date: "desc" as const };
  const include = {
    candidat: { select: { prenom: true, nom: true } },
    dossier: { select: { reference: true } },
  };

  const mapToRow = (t: any) => ({
    id: t.id,
    reference: t.reference,
    candidat: `${t.candidat.prenom} ${t.candidat.nom}`,
    dossier: t.dossier.reference,
    date: t.date.toISOString(),
    moyen: t.moyen,
    montant: t.montant,
    statut: t.statut,
    tranche: t.tranche,
  });

  if (hasPagination) {
    const [transactions, total] = await Promise.all([
      db.paiement.findMany({
        include,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
      }),
      db.paiement.count(),
    ]);
    return NextResponse.json({ data: transactions.map(mapToRow), total, page, pageSize });
  }

  const transactions = await db.paiement.findMany({ include, orderBy });
  return NextResponse.json(transactions.map(mapToRow));
}
