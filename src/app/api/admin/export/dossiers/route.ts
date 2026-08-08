import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { formatDateTime } from "@/lib/format";
import { buildExcelListingBuffer } from "@/lib/excel/documents";

// GET /api/admin/export/dossiers — Export Excel des dossiers
export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const gate = requirePermission(session.user.role, "dossiers.read");
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const dossiers = await db.dossier.findMany({
    include: {
      candidat: { select: { prenom: true, nom: true, email: true } },
      universite: { select: { nom: true } },
      formation: { select: { intitule: true } },
      conseiller: { select: { prenom: true, nom: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const columns = [
    { header: "Référence", key: "reference", width: 20 },
    { header: "Candidat", key: "candidat", width: 25 },
    { header: "E-mail", key: "email", width: 30 },
    { header: "Université", key: "universite", width: 35 },
    { header: "Formation", key: "formation", width: 35 },
    { header: "État", key: "etat", width: 15 },
    { header: "Étape", key: "etape", width: 10 },
    { header: "Conseiller", key: "conseiller", width: 20 },
    { header: "Frais (FCFA)", key: "frais", width: 15 },
    { header: "Paiement", key: "paiement", width: 15 },
    { header: "Date MAJ", key: "maj", width: 15 },
  ];

  const rows = dossiers.map((d) => [
    d.reference,
    `${d.candidat.prenom} ${d.candidat.nom}`,
    d.candidat.email,
    d.universite.nom,
    d.formation.intitule,
    d.etat,
    String(d.etapeActuelle),
    d.conseiller ? `${d.conseiller.prenom} ${d.conseiller.nom}` : "Non affecté",
    String(d.fraisAgence),
    d.paiementStatut,
    d.updatedAt.toISOString().split("T")[0],
  ]);

  const excelBuffer = await buildExcelListingBuffer({
    titre: "Export des dossiers",
    sousTitre: `${dossiers.length} dossier(s)`,
    generatedAtStr: formatDateTime(new Date().toISOString()),
    generatedBy: `${session.user.prenom} ${session.user.nom}`,
    columns,
    rows
  });

  const fileStamp = new Date().toISOString().replace(/[:T]/g, "-").split(".")[0];

  return new NextResponse(excelBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="dossiers-${fileStamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
