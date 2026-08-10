import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-auth";
import { readUpload } from "@/lib/storage";

// GET /api/admin/logement/[id]/files/[fileType] — consultation/téléchargement d'un fichier de réservation de logement
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; fileType: string }> }
) {
  const auth = await requireApiPermission("logement.read");
  if (!auth.ok) return auth.response;

  const { id, fileType } = await params;
  const reservation = await db.logementReservation.findUnique({
    where: { id },
  });

  if (!reservation) {
    return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  }

  let filePath: string | null = null;
  let defaultFilename = "document";

  if (fileType === "passeport") {
    filePath = reservation.fichierPasseportUrl;
    defaultFilename = `Passeport_${reservation.nom}_${reservation.prenom}`;
  } else if (fileType === "attestation") {
    filePath = reservation.fichierAttestationInscriptionUrl;
    defaultFilename = `Attestation_${reservation.nom}_${reservation.prenom}`;
  } else {
    return NextResponse.json({ error: "Type de fichier non valide" }, { status: 400 });
  }

  if (!filePath) {
    return NextResponse.json({ error: "Aucun fichier n'a été téléversé" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const disposition = searchParams.get("disposition") === "inline" ? "inline" : "attachment";

  try {
    const { buffer, contentType, fileName } = await readUpload(filePath, "private");
    const finalFileName = `${defaultFilename}_${fileName}`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `${disposition}; filename="${encodeURIComponent(finalFileName)}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Erreur lors de la lecture du fichier";
    return NextResponse.json({ error: errorMessage }, { status: 404 });
  }
}
