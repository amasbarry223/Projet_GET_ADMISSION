import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-auth";
import { formatDateTime } from "@/lib/format";
import { buildExcelListingBuffer } from "@/lib/excel/documents";

// GET /api/admin/export/candidats — export Excel des candidats
export async function GET() {
  const auth = await requireApiPermission("candidats.read");
  if (!auth.ok) return auth.response;

  const candidats = await db.user.findMany({
    where: { role: "CANDIDAT" },
    select: {
      prenom: true,
      nom: true,
      email: true,
      telephone: true,
      nationalite: true,
      actif: true,
      kycVerifie: true,
      createdAt: true,
      _count: { select: { dossiersCandidat: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const columns = [
    { header: "Prénom", key: "prenom", width: 20 },
    { header: "Nom", key: "nom", width: 20 },
    { header: "E-mail", key: "email", width: 30 },
    { header: "Téléphone", key: "telephone", width: 20 },
    { header: "Nationalité", key: "nationalite", width: 20 },
    { header: "Statut", key: "statut", width: 15 },
    { header: "KYC", key: "kyc", width: 15 },
    { header: "Dossiers", key: "dossiers", width: 10 },
    { header: "Inscription", key: "createdAt", width: 20 }
  ];

  const rows = candidats.map((c) => [
    c.prenom,
    c.nom,
    c.email,
    c.telephone ?? "—",
    c.nationalite ?? "—",
    c.actif ? "Actif" : "Désactivé",
    c.kycVerifie ? "Vérifié" : "En attente",
    String(c._count.dossiersCandidat),
    formatDateTime(c.createdAt.toISOString()),
  ]);

  const excelBuffer = await buildExcelListingBuffer({
    titre: "Candidats inscrits",
    sousTitre: `${candidats.length} candidat(s)`,
    generatedAtStr: formatDateTime(new Date().toISOString()),
    generatedBy: `${auth.user.prenom} ${auth.user.nom}`,
    columns,
    rows
  });

  const fileStamp = new Date().toISOString().replace(/[:T]/g, "-").split(".")[0];

  return new NextResponse(excelBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="candidats-${fileStamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
