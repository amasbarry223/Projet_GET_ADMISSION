import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { buildListingPdfBuffer } from "@/lib/pdf/documents";
import { formatDate, formatDateTime } from "@/lib/format";

// GET /api/admin/export/candidats/pdf — export PDF des candidats
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const gate = requirePermission(session.user.role, "candidats.read");
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const candidats = await db.user.findMany({
    where: { role: "CANDIDAT" },
    select: {
      prenom: true,
      nom: true,
      email: true,
      telephone: true,
      actif: true,
      createdAt: true,
      _count: { select: { dossiersCandidat: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const pdf = await buildListingPdfBuffer({
    titre: "Candidats inscrits",
    sousTitre: `${candidats.length} candidat(s)`,
    generatedAtStr: formatDateTime(new Date().toISOString()),
    generatedBy: `${session.user.prenom} ${session.user.nom}`,
    columns: [
      { label: "Nom", width: 140 },
      { label: "E-mail", width: 170 },
      { label: "Téléphone", width: 90 },
      { label: "Statut", width: 60 },
      { label: "Dossiers", width: 45 },
      { label: "Inscrit le", width: 78 },
    ],
    rows: candidats.map((c) => [
      `${c.prenom} ${c.nom}`,
      c.email,
      c.telephone ?? "—",
      c.actif ? "Actif" : "Désactivé",
      String(c._count.dossiersCandidat),
      formatDate(c.createdAt.toISOString()),
    ]),
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="candidats-${new Date().toISOString().split("T")[0]}.pdf"`,
    },
  });
}
