import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readUpload } from "@/lib/storage";
import { requireApiPermission } from "@/lib/api-auth";

// GET /api/messages-internes/[messageId]/download — pièce jointe d'un message interne
export async function GET(_request: Request, { params }: { params: Promise<{ messageId: string }> }) {
  const auth = await requireApiPermission("messages.internes");
  if (!auth.ok) return auth.response;

  const { messageId } = await params;
  const message = await db.messageInterne.findUnique({
    where: { id: messageId },
    include: { conversation: { select: { financierId: true } } },
  });

  if (!message || !message.pieceJointeChemin) {
    return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
  }

  const { role, id: userId } = auth.user;
  const isAdminSide = role === "ADMIN" || role === "SUPER_ADMIN";
  if (!isAdminSide && message.conversation.financierId !== userId) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
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
