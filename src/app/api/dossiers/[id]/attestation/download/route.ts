import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/api-auth";
import { readUpload } from "@/lib/storage";
import { buildPieceFilename } from "@/lib/dossier/piece-print";
import { hasPermission } from "@/lib/rbac";

// GET /api/dossiers/[id]/attestation/download — télécharge le document de préinscription téléversé
// Query params : ?disposition=inline (vue navigateur au lieu de forcer l'enregistrement)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const dossier = await db.dossier.findUnique({
    where: { id },
    select: {
      candidatId: true,
      conseillerId: true,
      candidat: { select: { prenom: true, nom: true } },
      attestation: { select: { cheminFichier: true, nomFichier: true } },
    },
  });
  if (!dossier) {
    return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
  }

  let hasAccess = false;
  if (auth.user.role === "CANDIDAT") {
    hasAccess = dossier.candidatId === auth.user.id;
  } else {
    hasAccess =
      hasPermission(auth.user.role, "attestations.read") ||
      hasPermission(auth.user.role, "dossiers.read") ||
      dossier.conseillerId === auth.user.id;
  }

  if (!hasAccess) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  if (!dossier.attestation?.cheminFichier) {
    return NextResponse.json({ error: "Aucun document d'attestation téléversé" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const disposition = searchParams.get("disposition") === "inline" ? "inline" : "attachment";

  try {
    const { buffer, contentType } = await readUpload(dossier.attestation.cheminFichier, "private");
    const ext = dossier.attestation.nomFichier?.split(".").pop() || "pdf";
    const fileName = buildPieceFilename(`${dossier.candidat.prenom} ${dossier.candidat.nom}`, "Attestation", ext);

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
