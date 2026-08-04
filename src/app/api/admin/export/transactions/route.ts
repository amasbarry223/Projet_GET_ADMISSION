import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { buildSimplePdf } from "@/lib/pdf";
import { formatDate, formatFCFA } from "@/lib/format";

// GET /api/admin/export/transactions?format=csv|pdf — Export des transactions (BF §4.5)
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const gate = requirePermission((session.user as { role?: string }).role, "finance.read");
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const format = new URL(request.url).searchParams.get("format") === "pdf" ? "pdf" : "csv";

  const transactions = await db.paiement.findMany({
    include: {
      candidat: { select: { prenom: true, nom: true } },
      dossier: { select: { reference: true } },
    },
    orderBy: { date: "desc" },
  });

  const dateStr = new Date().toISOString().split("T")[0];

  if (format === "pdf") {
    const lines = transactions.map(
      (t) =>
        `${t.reference}  ${formatDate(t.date.toISOString())}  ${t.candidat.prenom} ${t.candidat.nom}  ` +
        `${t.dossier.reference}  ${t.moyen}  ${formatFCFA(t.montant)}  ${t.statut}${t.tranche ? ` (${t.tranche})` : ""}`,
    );
    const pdf = buildSimplePdf(
      [`${transactions.length} transaction(s) — généré le ${formatDate(new Date().toISOString())}`, "", ...lines],
      "Transactions — GET Admission",
    );
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="transactions-${dateStr}.pdf"`,
      },
    });
  }

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
      "Content-Disposition": `attachment; filename="transactions-${dateStr}.csv"`,
    },
  });
}
