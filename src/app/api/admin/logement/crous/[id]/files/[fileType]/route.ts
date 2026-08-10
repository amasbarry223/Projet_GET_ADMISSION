import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-auth";
import { readUpload } from "@/lib/storage";

// GET /api/admin/logement/crous/[id]/files/[fileType] — consultation/téléchargement d'un fichier de demande CROUS
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; fileType: string }> }
) {
  const auth = await requireApiPermission("logement.read");
  if (!auth.ok) return auth.response;

  const { id, fileType } = await params;
  const demande = await db.demandeLogementCrous.findUnique({
    where: { id },
  });

  if (!demande) {
    return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  }

  let filePath: string | null = null;
  let defaultFilename = "document";

  if (fileType === "passeport_recto") {
    filePath = demande.fichierPasseportRectoUrl;
    defaultFilename = `Passeport_Recto_${demande.nom}_${demande.prenom}`;
  } else if (fileType === "passeport_verso") {
    filePath = demande.fichierPasseportVersoUrl;
    defaultFilename = `Passeport_Verso_${demande.nom}_${demande.prenom}`;
  } else if (fileType === "attestation") {
    filePath = demande.fichierAttestationAccordPrealableUrl;
    defaultFilename = `Attestation_Prealable_${demande.nom}_${demande.prenom}`;
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
