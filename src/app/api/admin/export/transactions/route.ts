import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { buildTransactionsPdfBuffer } from "@/lib/pdf/documents";
import { formatDateCourte, formatDateTime, formatFCFA } from "@/lib/format";

// GET /api/admin/export/transactions?format=excel|pdf — Export des transactions (BF §4.5)
export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const gate = requirePermission(session.user.role, "finance.read");
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const format = new URL(request.url).searchParams.get("format") === "pdf" ? "pdf" : "excel";

  const transactions = await db.paiement.findMany({
    include: {
      candidat: { select: { prenom: true, nom: true } },
      dossier: {
        select: {
          reference: true,
          universite: { select: { nom: true, typeEtablissement: true } },
        },
      },
    },
    orderBy: { date: "desc" },
  });

  const now = new Date();
  const fileStamp = now.toISOString().replace(/[:T]/g, "-").split(".")[0];
  const typeLabel = (t: (typeof transactions)[number]) =>
    t.dossier.universite.typeEtablissement === "PUBLIC" ? "Public" : "Privé";

  if (format === "pdf") {
    const pdf = await buildTransactionsPdfBuffer({
      titre: "Transactions",
      sousTitre: `${transactions.length} transaction(s) — généré le ${formatDateTime(new Date().toISOString())}`,
      generatedAtStr: formatDateTime(new Date().toISOString()),
      generatedBy: `${session.user.prenom} ${session.user.nom}`,
      transactions: transactions.map((t) => ({
        reference: t.reference,
        candidat: `${t.candidat.prenom} ${t.candidat.nom}`,
        dossier: t.dossier.reference,
        type: typeLabel(t),
        date: formatDateCourte(t.date.toISOString()),
        moyen: t.moyen,
        montant: formatFCFA(t.montant),
        statut: t.statut,
      })),
    });
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="transactions-${fileStamp}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  }

  // --- EXPORT EXCEL ---
  const { buildExcelListingBuffer } = await import("@/lib/excel/documents");

  const columns = [
    { header: "Référence", key: "reference", width: 20 },
    { header: "Candidat", key: "candidat", width: 25 },
    { header: "Dossier", key: "dossier", width: 20 },
    { header: "Université", key: "universite", width: 25 },
    { header: "Type", key: "type", width: 10 },
    { header: "Date", key: "date", width: 15 },
    { header: "Moyen", key: "moyen", width: 20 },
    { header: "Tranche", key: "tranche", width: 15 },
    { header: "Montant (FCFA)", key: "montant", width: 15 },
    { header: "Statut", key: "statut", width: 15 },
  ];
  
  const rows = transactions.map((t) => [
    t.reference,
    `${t.candidat.prenom} ${t.candidat.nom}`,
    t.dossier.reference,
    t.dossier.universite.nom,
    typeLabel(t),
    t.date.toISOString().slice(0, 10),
    t.moyen,
    t.tranche ?? "",
    String(t.montant),
    t.statut,
  ]);

  const excelBuffer = await buildExcelListingBuffer({
    titre: "Export des transactions",
    sousTitre: `${transactions.length} transaction(s)`,
    generatedAtStr: formatDateTime(new Date().toISOString()),
    generatedBy: `${session.user.prenom} ${session.user.nom}`,
    columns,
    rows
  });

  return new NextResponse(excelBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="transactions-${fileStamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
