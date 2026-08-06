import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-auth";
import { formatDate } from "@/lib/format";

// GET /api/admin/export/candidats — export CSV des candidats
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

  const headers = ["Prénom", "Nom", "E-mail", "Téléphone", "Nationalité", "Statut", "KYC", "Dossiers", "Date d'inscription"];
  const rows = candidats.map((c) => [
    c.prenom,
    c.nom,
    c.email,
    c.telephone ?? "",
    c.nationalite ?? "",
    c.actif ? "Actif" : "Désactivé",
    c.kycVerifie ? "Vérifié" : "En attente",
    String(c._count.dossiersCandidat),
    formatDate(c.createdAt.toISOString()),
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="candidats-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
