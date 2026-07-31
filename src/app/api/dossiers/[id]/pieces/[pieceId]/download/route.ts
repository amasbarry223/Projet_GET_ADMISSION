import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveUploadPath } from "@/lib/storage";
import { requirePermission } from "@/lib/rbac";
import { readFile } from "fs/promises";
import path from "path";

// GET /api/dossiers/[id]/pieces/[pieceId]/download — téléchargement fichier
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; pieceId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id, pieceId } = await params;
  const role = (session.user as { role?: string }).role;
  const userId = (session.user as { id: string }).id;

  const piece = await db.piece.findFirst({
    where: { id: pieceId, dossierId: id },
    include: { dossier: { select: { candidatId: true } } },
  });

  if (!piece || !piece.cheminFichier) {
    return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
  }

  if (role === "CANDIDAT") {
    if (piece.dossier.candidatId !== userId) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
  } else {
    const gate = requirePermission(role, "dossiers.read");
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const abs = resolveUploadPath(piece.cheminFichier);
    const buffer = await readFile(abs);
    const ext = path.extname(piece.cheminFichier).toLowerCase();
    const mime =
      ext === ".pdf"
        ? "application/pdf"
        : ext === ".png"
          ? "image/png"
          : ext === ".webp"
            ? "image/webp"
            : "image/jpeg";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(piece.nomFichier || "piece")}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch {
    return NextResponse.json({ error: "Fichier inaccessible" }, { status: 404 });
  }
}
