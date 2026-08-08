import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { readUpload } from "@/lib/storage";
import { assertDossierFileAccess } from "@/lib/dossier/piece-print";

// GET /api/messages/[messageId]/download — téléchargement de la pièce jointe d'un message
export async function GET(_request: Request, { params }: { params: Promise<{ messageId: string }> }) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { messageId } = await params;
  const message = await db.message.findUnique({
    where: { id: messageId },
    include: { conversation: { select: { candidatId: true, conseillerId: true } } },
  });

  if (!message || !message.pieceJointeChemin) {
    return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
  }

  const access = assertDossierFileAccess(
    session.user.role,
    session.user.id,
    message.conversation.candidatId,
    message.conversation.conseillerId,
  );
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { buffer, contentType } = await readUpload(message.pieceJointeChemin, "private");
    const fileName = message.pieceJointeNom || "piece-jointe";

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch {
    return NextResponse.json({ error: "Fichier inaccessible" }, { status: 404 });
  }
}
