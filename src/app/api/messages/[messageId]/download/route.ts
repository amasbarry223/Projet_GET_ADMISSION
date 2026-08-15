import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { readUpload } from "@/lib/storage";
import { hasPermission } from "@/lib/rbac";

// GET /api/messages/[messageId]/download — téléchargement de la pièce jointe d'un message
export async function GET(request: Request, { params }: { params: Promise<{ messageId: string }> }) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { messageId } = await params;
  const url = new URL(request.url);
  const disposition = url.searchParams.get("disposition") === "inline" ? "inline" : "attachment";
  const message = await db.message.findUnique({
    where: { id: messageId },
    include: {
      conversation: {
        select: {
          candidatId: true,
          conseillerId: true,
          dossier: { select: { candidatId: true, conseillerId: true } },
        },
      },
    },
  });

  if (!message || !message.pieceJointeChemin) {
    return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
  }

  const candidatId = message.conversation.dossier?.candidatId ?? message.conversation.candidatId;
  const conseillerId = message.conversation.dossier?.conseillerId ?? message.conversation.conseillerId;

  // Accès : candidat propriétaire, auteur du message, conseiller affecté ou staff autorisé
  let hasAccess = false;
  if (session.user.id === candidatId || session.user.id === message.auteurId) {
    hasAccess = true;
  } else if (session.user.role === "CONSEILLER") {
    hasAccess = session.user.id === conseillerId || session.user.id === message.auteurId;
  } else {
    hasAccess = hasPermission(session.user.role, "dossiers.read");
  }

  if (!hasAccess) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  try {
    const { buffer, contentType } = await readUpload(message.pieceJointeChemin, "private");
    const fileName = message.pieceJointeNom || "piece-jointe";

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
