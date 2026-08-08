import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messageInterneSchema } from "@/lib/validations";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";
import { requireApiPermission } from "@/lib/api-auth";
import { notifyMessageInterne } from "@/lib/notifications";
import { saveUpload } from "@/lib/storage";
import { validateUploadFile, formatFileSize } from "@/lib/file-validation";
import { broadcastMessageInterneLive } from "@/lib/messages/live-broadcast";

const MESSAGES_INCLUDE = {
  messages: {
    include: { auteur: { select: { prenom: true, nom: true, role: true } } },
    orderBy: { createdAt: "asc" as const },
  },
  financier: { select: { id: true, prenom: true, nom: true, role: true } },
};

// GET /api/messages-internes — Financier/Conseiller : son fil avec la direction.
// GET /api/messages-internes?financierId=xxx — Admin/Super Admin : le fil d'un financier ou conseiller donné.
// GET /api/messages-internes (sans financierId, rôle Admin/Super Admin) — la liste de tous les fils (boîte de réception).
export async function GET(request: Request) {
  const auth = await requireApiPermission("messages.internes");
  if (!auth.ok) return auth.response;

  const { role, id: userId } = auth.user;
  const { searchParams } = new URL(request.url);
  const financierId = searchParams.get("financierId");

  if (role === "FINANCIER" || role === "CONSEILLER") {
    const conversation = await db.conversationInterne.findUnique({
      where: { financierId: userId },
      include: MESSAGES_INCLUDE,
    });
    return NextResponse.json(conversation);
  }

  // Admin / Super Admin
  if (financierId) {
    const conversation = await db.conversationInterne.findUnique({
      where: { financierId },
      include: MESSAGES_INCLUDE,
    });
    return NextResponse.json(conversation);
  }

  const conversations = await db.conversationInterne.findMany({
    include: {
      financier: { select: { id: true, prenom: true, nom: true, role: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(
    conversations.map((c) => ({
      financier: c.financier,
      nonLusAdmin: c.nonLusAdmin,
      updatedAt: c.updatedAt,
      dernierMessage: c.messages[0]?.texte ?? null,
    })),
  );
}

// POST /api/messages-internes — envoyer un message (multipart/form-data : texte?, fichier?, financierId?)
// Financier/Conseiller : écrit dans son propre fil (créé au premier message).
// Admin/Super Admin : doit fournir financierId (répond à un fil déjà ouvert par ce financier/conseiller).
export async function POST(request: Request) {
  const auth = await requireApiPermission("messages.internes");
  if (!auth.ok) return auth.response;

  const rateLimited = await checkRateLimit(getClientId(request), "/api/messages-internes");
  if (rateLimited) return rateLimited;

  const form = await request.formData();
  const fichier = form.get("fichier");

  const parsed = messageInterneSchema.safeParse({
    texte: form.get("texte") ? String(form.get("texte")) : undefined,
    financierId: form.get("financierId") ? String(form.get("financierId")) : undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides" }, { status: 400 });
  }
  const { texte, financierId: financierIdBody } = parsed.data;
  const hasFile = fichier instanceof File && fichier.size > 0;

  if (!texte.trim() && !hasFile) {
    return NextResponse.json({ error: "Le message ne peut pas être vide" }, { status: 400 });
  }

  const { role, id: userId } = auth.user;

  let pieceJointeNom: string | null = null;
  let pieceJointeTaille: string | null = null;
  let pieceJointeChemin: string | null = null;
  if (hasFile) {
    const validationError = validateUploadFile(fichier);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }
    try {
      const upload = await saveUpload(fichier, `messages-internes/${userId}`, { visibility: "private" });
      pieceJointeNom = fichier.name;
      pieceJointeTaille = formatFileSize(fichier.size);
      pieceJointeChemin = upload.cheminRelatif;
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Téléversement du fichier échoué" },
        { status: 400 },
      );
    }
  }

  if (role === "FINANCIER" || role === "CONSEILLER") {
    const conversation = await db.conversationInterne.upsert({
      where: { financierId: userId },
      update: {},
      create: { financierId: userId },
    });

    const message = await db.messageInterne.create({
      data: {
        conversationId: conversation.id,
        auteurId: userId,
        texte: texte.trim(),
        pieceJointeNom,
        pieceJointeTaille,
        pieceJointeChemin,
      },
      include: { auteur: { select: { prenom: true, nom: true, role: true } } },
    });

    await db.conversationInterne.update({
      where: { id: conversation.id },
      data: { nonLusAdmin: { increment: 1 } },
    });

    const destinataires = await db.user.findMany({
      where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, actif: true },
      select: { id: true },
    });
    await notifyMessageInterne({
      destinataireIds: destinataires.map((u) => u.id),
      auteurNom: `${message.auteur.prenom} ${message.auteur.nom}`,
      texte: message.texte,
    });

    void broadcastMessageInterneLive(conversation.id);

    return NextResponse.json(message, { status: 201 });
  }

  // Admin / Super Admin — répond à un fil déjà ouvert par un financier/conseiller
  if (!financierIdBody) {
    return NextResponse.json({ error: "financierId requis" }, { status: 400 });
  }

  const conversation = await db.conversationInterne.findUnique({ where: { financierId: financierIdBody } });
  if (!conversation) {
    return NextResponse.json(
      { error: "Ce financier n'a pas encore ouvert de conversation." },
      { status: 404 },
    );
  }

  const message = await db.messageInterne.create({
    data: {
      conversationId: conversation.id,
      auteurId: userId,
      texte: texte.trim(),
      pieceJointeNom,
      pieceJointeTaille,
      pieceJointeChemin,
    },
    include: { auteur: { select: { prenom: true, nom: true, role: true } } },
  });

  await db.conversationInterne.update({
    where: { id: conversation.id },
    data: { nonLusFinancier: { increment: 1 } },
  });

  await notifyMessageInterne({
    destinataireIds: [financierIdBody],
    auteurNom: `${message.auteur.prenom} ${message.auteur.nom}`,
    texte: message.texte,
  });

  void broadcastMessageInterneLive(conversation.id);

  return NextResponse.json(message, { status: 201 });
}
