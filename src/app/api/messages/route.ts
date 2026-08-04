import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messageSchema } from "@/lib/validations";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";
import { requireApiUser, parseOrRespond } from "@/lib/api-auth";
import { requirePermission } from "@/lib/rbac";

// GET /api/messages?dossierId=xxx — conversation d'un dossier
export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const dossierId = searchParams.get("dossierId");
  if (!dossierId) {
    return NextResponse.json({ error: "dossierId requis" }, { status: 400 });
  }

  const { role, id: userId } = auth.user;

  const dossier = await db.dossier.findUnique({
    where: { id: dossierId },
    select: { candidatId: true },
  });
  if (!dossier) {
    return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
  }

  if (role === "CANDIDAT") {
    if (dossier.candidatId !== userId) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
  } else {
    const gate = requirePermission(role, "dossiers.read");
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const conversation = await db.conversation.findUnique({
    where: { dossierId },
    include: {
      messages: {
        include: { auteur: { select: { prenom: true, nom: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
      candidat: { select: { prenom: true, nom: true } },
      conseiller: { select: { prenom: true, nom: true, photoUrl: true } },
    },
  });

  if (!conversation) {
    return NextResponse.json(null);
  }

  return NextResponse.json(conversation);
}

// POST /api/messages — envoyer un message
export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;

  // Rate limiting (30 messages / min / IP)
  const rateLimited = await checkRateLimit(getClientId(request), "/api/messages");
  if (rateLimited) return rateLimited;

  const body = await request.json();
  const parsed = parseOrRespond(messageSchema, body);
  if (!parsed.ok) return parsed.response;
  const { dossierId, texte, pieceJointeNom, pieceJointeTaille } = parsed.data;

  const { id: userId, role } = auth.user;

  const dossier = await db.dossier.findUnique({
    where: { id: dossierId },
    select: { id: true, candidatId: true, conseillerId: true },
  });
  if (!dossier) {
    return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
  }

  // Ownership / permission AVANT toute création (anti-IDOR)
  if (role === "CANDIDAT") {
    if (dossier.candidatId !== userId) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
  } else {
    const gate = requirePermission(role, "dossiers.write");
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  // Trouver ou créer la conversation
  let conversation = await db.conversation.findUnique({ where: { dossierId } });

  if (!conversation) {
    conversation = await db.conversation.create({
      data: {
        dossierId,
        candidatId: dossier.candidatId,
        conseillerId: role === "CONSEILLER" ? userId : dossier.conseillerId,
      },
    });
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
