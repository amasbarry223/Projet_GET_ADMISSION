import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/admin/export/transactions — Export CSV des transactions
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

  // Génère le CSV
  const headers = ["Référence", "Candidat", "Dossier", "Date", "Moyen", "Montant (FCFA)", "Statut", "Tranche"];
  const rows = transactions.map((t) => [
    t.reference,
    `${t.candidat.prenom} ${t.candidat.nom}`,
    t.dossier.reference,
    t.date.toISOString().split("T")[0],
    t.moyen,
    String(t.montant),
    t.statut,
    t.tranche ?? "",
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="transactions-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
