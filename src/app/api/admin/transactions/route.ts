import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { paginationQuerySchema } from "@/lib/validations";

const transactionInclude = {
  candidat: { select: { prenom: true, nom: true } },
  dossier: { select: { reference: true } },
} satisfies Prisma.PaiementInclude;

type TransactionRow = Prisma.PaiementGetPayload<{ include: typeof transactionInclude }>;

// GET /api/admin/transactions — liste des transactions (staff uniquement)
//
// Comportement de pagination (backward compatible) :
// - Sans `?page=`      → renvoie un tableau plat (legacy).
// - Avec `?page=N`      → renvoie { data, total, page, pageSize }.
export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const gate = requirePermission(session.user.role, "finance.read");
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { searchParams } = new URL(request.url);
  const hasPagination = searchParams.has("page");
  const query = paginationQuerySchema.parse({
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
    q: searchParams.get("q") ?? undefined,
  });
  const page = query.page;
  const pageSize = Math.min(50, query.pageSize);

  const orderBy = { date: "desc" as const };

  const mapToRow = (t: TransactionRow) => ({
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
        include: transactionInclude,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
      }),
      db.paiement.count(),
    ]);
    return NextResponse.json({ data: transactions.map(mapToRow), total, page, pageSize });
  }

  const transactions = await db.paiement.findMany({ include: transactionInclude, orderBy });
  return NextResponse.json(transactions.map(mapToRow));
}
