import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { readUpload } from "@/lib/storage";
import { buildPiecesDossierPdfBuffer, type PieceDossierInput } from "@/lib/pdf/documents";
import { assertDossierFileAccess, buildPieceFilename } from "@/lib/dossier/piece-print";
import { formatDateTime } from "@/lib/format";

// GET /api/dossiers/[id]/pieces/export — compile toutes les pièces du dossier en un seul PDF
// Query params : ?disposition=inline (vue navigateur, utilisé par la page d'impression groupée)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const role = session.user.role;
  const userId = session.user.id;

  const dossier = await db.dossier.findUnique({
    where: { id },
    select: {
      reference: true,
      candidatId: true,
      conseillerId: true,
      candidat: { select: { prenom: true, nom: true } },
      pieces: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!dossier) {
    return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
  }

  const access = assertDossierFileAccess(role, userId, dossier.candidatId, dossier.conseillerId);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  if (dossier.pieces.length === 0) {
    return NextResponse.json({ error: "Aucune pièce à compiler pour ce dossier" }, { status: 400 });
  }

  const pieces: PieceDossierInput[] = await Promise.all(
    dossier.pieces.map(async (p): Promise<PieceDossierInput> => {
      if (!p.cheminFichier) {
        return { libelle: p.libelle, statut: p.statut, buffer: null, contentType: null };
      }
      try {
        const { buffer, contentType } = await readUpload(p.cheminFichier, "private");
        return { libelle: p.libelle, statut: p.statut, buffer, contentType };
      } catch {
        return { libelle: p.libelle, statut: p.statut, buffer: null, contentType: null };
      }
    }),
  );

  const candidatNom = `${dossier.candidat.prenom} ${dossier.candidat.nom}`;
  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await buildPiecesDossierPdfBuffer({
      dossierRef: dossier.reference,
      candidat: candidatNom,
      generatedAtStr: formatDateTime(new Date().toISOString()),
      generatedBy: `${session.user.prenom} ${session.user.nom}`,
      pieces,
    });
  } catch (e) {
    console.error("[pieces/export] PDF generation failed", e);
    return NextResponse.json({ error: "Impossible de générer le PDF des pièces" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const disposition = searchParams.get("disposition") === "inline" ? "inline" : "attachment";
  const filename = buildPieceFilename(candidatNom, `Dossier_${dossier.reference}`, "pdf");

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${encodeURIComponent(filename)}"`,
      "Content-Length": String(pdfBytes.length),
    },
  });
}
