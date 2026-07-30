import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { markReadSchema, validate } from "@/lib/validations";

// PUT /api/messages/read — marquer les messages d'une conversation comme lus
//
// Body: { dossierId }
// - Candidat : reset nonLusCandidat à 0
// - Staff : reset nonLusConseiller à 0
//
// RBAC : candidat propriétaire de la conversation OU staff
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = validate(markReadSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { dossierId } = parsed.data;

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  const conversation = await db.conversation.findUnique({
    where: { dossierId },
    select: { id: true, candidatId: true },
  });
  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation non trouvée" },
      { status: 404 }
    );
  }

  // RBAC : candidat ne marque que sa conversation
  if (role === "CANDIDAT" && conversation.candidatId !== userId) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const updated = await db.conversation.update({
    where: { id: conversation.id },
    data: role === "CANDIDAT"
      ? { nonLusCandidat: 0 }
      : { nonLusConseiller: 0 },
  });

  return NextResponse.json({
    success: true,
    nonLusCandidat: updated.nonLusCandidat,
    nonLusConseiller: updated.nonLusConseiller,
  });
}
