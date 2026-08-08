import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { buildListingPdfBuffer } from "@/lib/pdf/documents";
import { formatDateCourte, formatDateTime } from "@/lib/format";

// GET /api/admin/export/candidats/pdf — export PDF des candidats
export async function GET() {
  const session = await getSession();
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
    // Largeurs recalculées pour tenir dans CONTENT_WIDTH (~483pt) — l'ancien total (583pt) dépassait
    // la zone imprimable, faisant déborder les dernières colonnes hors page.
    columns: [
      { label: "Nom", width: 108 },
      { label: "E-mail", width: 155 },
      { label: "Téléphone", width: 75 },
      { label: "Statut", width: 55 },
      { label: "Dossiers", width: 40 },
      { label: "Inscrit le", width: 50 },
    ],
    rows: candidats.map((c) => [
      `${c.prenom} ${c.nom}`,
      c.email,
      c.telephone ?? "—",
      c.actif ? "Actif" : "Désactivé",
      String(c._count.dossiersCandidat),
      formatDateCourte(c.createdAt.toISOString()),
    ]),
  });

  const fileStamp = new Date().toISOString().replace(/[:T]/g, "-").split(".")[0];
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="candidats-${fileStamp}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
