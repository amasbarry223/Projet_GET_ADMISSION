import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { markReadInterneSchema } from "@/lib/validations";
import { requireApiPermission, parseOrRespond } from "@/lib/api-auth";

// PUT /api/messages-internes/read — marquer un fil de la messagerie interne comme lu.
// Financier : reset nonLusFinancier de son propre fil.
// Admin/Super Admin : reset nonLusAdmin du fil { financierId } fourni.
export async function PUT(request: Request) {
  const auth = await requireApiPermission("messages.internes");
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const parsed = parseOrRespond(markReadInterneSchema, body);
  if (!parsed.ok) return parsed.response;

  const { role, id: userId } = auth.user;

  if (role === "FINANCIER") {
    const conversation = await db.conversationInterne.findUnique({ where: { financierId: userId } });
    if (!conversation) return NextResponse.json({ success: true, nonLus: 0 });
    const updated = await db.conversationInterne.update({
      where: { id: conversation.id },
      data: { nonLusFinancier: 0 },
    });
    return NextResponse.json({ success: true, nonLus: updated.nonLusFinancier });
  }

  const { financierId } = parsed.data;
  if (!financierId) {
    return NextResponse.json({ error: "financierId requis" }, { status: 400 });
  }
  const conversation = await db.conversationInterne.findUnique({ where: { financierId } });
  if (!conversation) return NextResponse.json({ success: true, nonLus: 0 });
  const updated = await db.conversationInterne.update({
    where: { id: conversation.id },
    data: { nonLusAdmin: 0 },
  });
  return NextResponse.json({ success: true, nonLus: updated.nonLusAdmin });
}
