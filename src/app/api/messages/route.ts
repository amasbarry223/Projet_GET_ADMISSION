import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { messageSchema, validate } from "@/lib/validations";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";

// GET /api/messages?dossierId=xxx — conversation d'un dossier
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dossierId = searchParams.get("dossierId");
  if (!dossierId) {
    return NextResponse.json({ error: "dossierId requis" }, { status: 400 });
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  // RBAC : candidat ne voit que sa conversation, staff voit tout
  const conversation = await db.conversation.findUnique({
    where: { dossierId },
    include: {
      messages: {
        include: { auteur: { select: { prenom: true, nom: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
      candidat: { select: { prenom: true, nom: true } },
      conseiller: { select: { prenom: true, nom: true } },
    },
  });

  if (!conversation) {
    return NextResponse.json(null);
  }

  if (role === "CANDIDAT" && conversation.candidatId !== userId) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  return NextResponse.json(conversation);
}

// POST /api/messages — envoyer un message
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  // Rate limiting (30 messages / min / IP)
  const rateLimited = checkRateLimit(getClientId(request), "/api/messages");
  if (rateLimited) return rateLimited;

  const body = await request.json();
  const parsed = validate(messageSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { dossierId, texte, pieceJointeNom, pieceJointeTaille } = parsed.data;

  const userId = (session.user as any).id;
  const role = (session.user as any).role;

  // Trouver ou créer la conversation
  let conversation = await db.conversation.findUnique({ where: { dossierId } });

  if (!conversation) {
    const dossier = await db.dossier.findUnique({ where: { id: dossierId } });
    if (!dossier) {
      return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
    }
    conversation = await db.conversation.create({
      data: {
        dossierId,
        candidatId: role === "CANDIDAT" ? userId : dossier.candidatId,
        conseillerId: role === "CONSEILLER" ? userId : dossier.conseillerId,
      },
    });
  }

  // RBAC : candidat ne peut écrire que dans sa conversation
  if (role === "CANDIDAT" && conversation.candidatId !== userId) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const message = await db.message.create({
    data: {
      conversationId: conversation.id,
      auteurId: userId,
      texte: texte.trim(),
      pieceJointeNom: pieceJointeNom || null,
      pieceJointeTaille: pieceJointeTaille || null,
    },
    include: { auteur: { select: { prenom: true, nom: true, role: true } } },
  });

  // Incrémenter le compteur de non lus du destinataire
  if (role === "CANDIDAT") {
    await db.conversation.update({
      where: { id: conversation.id },
      data: { nonLusConseiller: { increment: 1 } },
    });
  } else {
    await db.conversation.update({
      where: { id: conversation.id },
      data: { nonLusCandidat: { increment: 1 } },
    });
  }

  return NextResponse.json(message, { status: 201 });
}
