import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiCandidat } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { notifyStaffDemandeRemboursement } from "@/lib/notifications";
import { formatFCFA } from "@/lib/format";
import { z } from "zod";


const demandeSchema = z.object({
  motif: z.string().max(300, "Le motif ne doit pas dépasser 300 caractères").optional(),
});

// POST /api/paiements/[id]/demande-remboursement
// Permet à un candidat de solliciter le remboursement d'une transaction confirmée (statut "reussi").
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiCandidat();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const userId = auth.user.id;
  const candidatNom = `${auth.user.prenom} ${auth.user.nom}`;

  let motif: string | undefined;
  try {
    const json = await request.json().catch(() => ({}));
    const parsed = demandeSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Données invalides" },
        { status: 400 },
      );
    }
    motif = parsed.data.motif?.trim() || undefined;
  } catch {
    motif = undefined;
  }

  const paiement = await db.paiement.findUnique({
    where: { id },
    include: {
      dossier: {
        include: {
          candidat: { select: { id: true, email: true, prenom: true, nom: true } },
          universite: { select: { nom: true } },
        },
      },
    },
  });

  if (!paiement || paiement.candidatId !== userId) {
    return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });
  }

  if (paiement.statut !== "reussi") {
    return NextResponse.json(
      {
        error:
          paiement.statut === "rembourse"
            ? "Ce paiement a déjà été remboursé."
            : "Une demande de remboursement ne peut être effectuée que sur un paiement confirmé.",
      },
      { status: 400 },
    );
  }

  const dossier = paiement.dossier;
  const montantFormate = formatFCFA(paiement.montant);

  // 1. Ajouter une note dans l'historique du dossier
  await db.historique.create({
    data: {
      dossierId: dossier.id,
      etat: dossier.etat,
      auteur: candidatNom,
      auteurId: userId,
      note: `Demande de remboursement pour le paiement ${paiement.reference} (${montantFormate}).${motif ? ` Motif : ${motif}` : ""}`,
    },
  });

  // 2. Poster le message dans la messagerie du dossier
  let conversation = await db.conversation.findUnique({ where: { dossierId: dossier.id } });
  if (!conversation) {
    conversation = await db.conversation.create({
      data: {
        dossierId: dossier.id,
        candidatId: userId,
        conseillerId: dossier.conseillerId ?? null,
      },
    });
  }

  const messageTexte = `Demande de remboursement — Paiement ${paiement.reference} (${montantFormate}).${motif ? ` Motif : ${motif}` : " Je souhaite échanger avec l'administration concernant les détails du remboursement."}`;
  await db.message.create({
    data: {
      conversationId: conversation.id,
      auteurId: userId,
      texte: messageTexte,
    },
  });

  await db.conversation.update({
    where: { id: conversation.id },
    data: { nonLusConseiller: { increment: 1 } },
  });

  // 3. Notifier le staff (Admin / Super Admin)
  await notifyStaffDemandeRemboursement({
    dossierId: dossier.id,
    dossierReference: dossier.reference,
    paiementReference: paiement.reference,
    montant: montantFormate,
    candidatNom,
    motif,
  });

  // 4. Journal d'audit
  await logAudit({
    session: auth.session,
    action: "CREATE",
    resource: "paiement",
    resourceId: id,
    details: `Demande de remboursement soumise par le candidat (${paiement.reference} - ${montantFormate})${motif ? ` : ${motif}` : ""}`,
  });

  return NextResponse.json({ success: true });
}

