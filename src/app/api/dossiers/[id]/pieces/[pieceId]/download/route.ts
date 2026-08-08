import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { readUpload } from "@/lib/storage";
import { assertDossierFileAccess } from "@/lib/dossier/piece-print";

// GET /api/dossiers/[id]/pieces/[pieceId]/download — téléchargement fichier
// Query params optionnels : ?disposition=inline (vue navigateur au lieu de forcer l'enregistrement)
//                            ?filename=... (nom de fichier personnalisé, ex. convention NomEtudiant_TypePiece_Date)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; pieceId: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id, pieceId } = await params;
  const role = session.user.role;
  const userId = session.user.id;

  const piece = await db.piece.findFirst({
    where: { id: pieceId, dossierId: id },
    include: { dossier: { select: { candidatId: true, conseillerId: true } } },
  });

  if (!piece || !piece.cheminFichier) {
    return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
  }

  const access = assertDossierFileAccess(role, userId, piece.dossier.candidatId, piece.dossier.conseillerId);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { searchParams } = new URL(request.url);
  const disposition = searchParams.get("disposition") === "inline" ? "inline" : "attachment";
  const customFilename = searchParams.get("filename");

  try {
    const { buffer, contentType } = await readUpload(piece.cheminFichier, "private");
    const fileName = (customFilename && customFilename.trim()) || piece.nomFichier || "piece";

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `${disposition}; filename="${encodeURIComponent(fileName)}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch {
    return NextResponse.json({ error: "Fichier inaccessible" }, { status: 404 });
  }
}
