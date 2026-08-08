import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messageSchema } from "@/lib/validations";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";
import { requireApiUser } from "@/lib/api-auth";
import { requirePermission } from "@/lib/rbac";
import { saveUpload } from "@/lib/storage";
import { validateUploadFile, formatFileSize } from "@/lib/file-validation";
import { notifyMessageDossier } from "@/lib/notifications";
import { broadcastMessageLive } from "@/lib/messages/live-broadcast";

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
    select: { candidatId: true, conseillerId: true },
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
    if (role === "CONSEILLER" && dossier.conseillerId !== userId) {
      return NextResponse.json({ error: "Accès refusé — ce dossier ne vous est pas affecté" }, { status: 403 });
    }
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

// POST /api/messages — envoyer un message (multipart/form-data : dossierId, texte?, fichier?)
export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;

  // Rate limiting (30 messages / min / IP)
  const rateLimited = await checkRateLimit(getClientId(request), "/api/messages");
  if (rateLimited) return rateLimited;

  const form = await request.formData();
  const fichier = form.get("fichier");

  const parsed = messageSchema.safeParse({
    dossierId: form.get("dossierId") ? String(form.get("dossierId")) : undefined,
    texte: form.get("texte") ? String(form.get("texte")) : undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides" }, { status: 400 });
  }
  const { dossierId, texte } = parsed.data;
  const hasFile = fichier instanceof File && fichier.size > 0;

  if (!texte.trim() && !hasFile) {
    return NextResponse.json({ error: "Le message ne peut pas être vide" }, { status: 400 });
  }

  const { id: userId, role, prenom, nom } = auth.user;

  const dossier = await db.dossier.findUnique({
    where: { id: dossierId },
    select: { id: true, reference: true, candidatId: true, conseillerId: true },
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
    if (role === "CONSEILLER" && dossier.conseillerId !== userId) {
      return NextResponse.json({ error: "Accès refusé — ce dossier ne vous est pas affecté" }, { status: 403 });
    }
  }

  let pieceJointeNom: string | null = null;
  let pieceJointeTaille: string | null = null;
  let pieceJointeChemin: string | null = null;
  if (hasFile) {
    const validationError = validateUploadFile(fichier);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }
    try {
      const upload = await saveUpload(fichier, `messages/${dossierId}`, { visibility: "private" });
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
      pieceJointeNom,
      pieceJointeTaille,
      pieceJointeChemin,
    },
    include: { auteur: { select: { prenom: true, nom: true, role: true } } },
  });

  // Incrémenter le compteur de non lus du destinataire + notifier
  const auteurNom = `${prenom} ${nom}`;
  if (role === "CANDIDAT") {
    await db.conversation.update({
      where: { id: conversation.id },
      data: { nonLusConseiller: { increment: 1 } },
    });
    if (conversation.conseillerId) {
      await notifyMessageDossier({
        dossierId: dossier.id,
        dossierReference: dossier.reference,
        destinataireId: conversation.conseillerId,
        auteurNom,
        texte: message.texte,
        lien: `/admin/dossiers/${dossier.id}`,
      });
    }
  } else {
    await db.conversation.update({
      where: { id: conversation.id },
      data: { nonLusCandidat: { increment: 1 } },
    });
    await notifyMessageDossier({
      dossierId: dossier.id,
      dossierReference: dossier.reference,
      destinataireId: dossier.candidatId,
      auteurNom,
      texte: message.texte,
      lien: `/espace/messages?dossierId=${dossier.id}`,
    });
  }

  void broadcastMessageLive(dossier.id);

  return NextResponse.json(message, { status: 201 });
}
