import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseOrRespond } from "@/lib/api-auth";
import { verifyGeniusPaySignature } from "@/lib/paiement/geniuspay";
import { geniusPayWebhookSchema } from "@/lib/validations";
import {
  afterPaiementReussiSideEffects,
  applyPaiementReussiInTx,
  lockDossierRow,
} from "@/lib/dossier/paiement-effects";
import { broadcastDossierLive } from "@/lib/dossier/live-broadcast";
import { logAudit } from "@/lib/audit";

/**
 * POST /api/paiements/webhook/geniuspay — Webhook instantané GeniusPay (sans session).
 * Reçoit les événements GeniusPay (payment.success, payment.failed, payment.cancelled, etc.)
 */
export async function POST(request: Request) {
  let rawBody = "";
  let payload: Record<string, unknown> = {};

  try {
    rawBody = await request.text();
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Payload JSON invalide" }, { status: 400 });
  }

  const validated = parseOrRespond(geniusPayWebhookSchema, payload);
  if (!validated.ok) return validated.response;

  const data = validated.data;
  const signatureHeader =
    request.headers.get("x-geniuspay-signature") ||
    request.headers.get("X-GeniusPay-Signature");

  const secret = process.env.GENIUSPAY_WEBHOOK_SECRET || process.env.GENIUSPAY_API_SECRET;
  if (secret && signatureHeader) {
    const isValid = verifyGeniusPaySignature(rawBody, signatureHeader, secret);
    if (!isValid) {
      return NextResponse.json({ error: "Signature webhook GeniusPay invalide" }, { status: 401 });
    }
  }

  const transaction = data.data?.transaction;
  const event = data.event;
  const metadata = transaction?.metadata;

  const refCommand = metadata?.order_id || transaction?.reference;
  const paiementId = metadata?.paiementId;

  if (!refCommand && !paiementId) {
    return NextResponse.json({ error: "Identifiant de paiement absent du metadata" }, { status: 400 });
  }

  const paiement = await db.paiement.findFirst({
    where: {
      OR: [
        ...(paiementId ? [{ id: paiementId }] : []),
        ...(refCommand ? [{ reference: refCommand }] : []),
      ],
    },
    include: {
      dossier: {
        include: { candidat: { select: { email: true, prenom: true } } },
      },
    },
  });

  if (!paiement) {
    return NextResponse.json({ error: "Paiement introuvable" }, { status: 404 });
  }

  if (paiement.statut === "reussi") {
    return NextResponse.json({ success: true, idempotent: true });
  }

  const isSuccess =
    event === "payment.success" ||
    transaction?.status === "completed" ||
    transaction?.status === "paid";

  if (!isSuccess) {
    await db.paiement.update({
      where: { id: paiement.id },
      data: { statut: "echoue" },
    });
    return NextResponse.json({ success: true, statut: "echoue" });
  }

  const result = await db.$transaction(async (tx) => {
    await lockDossierRow(tx, paiement.dossierId);
    const current = await tx.paiement.findUnique({ where: { id: paiement.id } });
    if (!current || current.statut === "reussi") {
      return { etat: paiement.dossier.etat, skipped: true as const };
    }

    await tx.paiement.update({
      where: { id: paiement.id },
      data: { statut: "reussi" },
    });

    const dossier = await tx.dossier.findUnique({
      where: { id: paiement.dossierId },
      include: { candidat: { select: { email: true, prenom: true } } },
    });
    if (!dossier) throw new Error("DOSSIER_NOT_FOUND");

    const applied = await applyPaiementReussiInTx(tx, {
      paiement: {
        id: paiement.id,
        reference: paiement.reference,
        montant: paiement.montant,
        moyen: paiement.moyen || "GeniusPay",
        dossierId: paiement.dossierId,
      },
      dossier,
      userId: "systeme-geniuspay",
      auteurLabel: "GeniusPay",
    });

    return { etat: applied.etat, skipped: false as const, dossier };
  });

  if (!result.skipped && "dossier" in result && result.dossier) {
    await afterPaiementReussiSideEffects({
      paiement: {
        id: paiement.id,
        reference: paiement.reference,
        montant: paiement.montant,
        dossierId: paiement.dossierId,
      },
      candidatId: result.dossier.candidatId,
      candidat: result.dossier.candidat,
      etat: result.etat,
    });

    void broadcastDossierLive({
      dossierId: paiement.dossierId,
      candidatId: result.dossier.candidatId,
      etat: result.etat,
    });
  }

  await logAudit({
    session: null,
    action: "UPDATE",
    resource: "paiement",
    resourceId: paiement.id,
    details: `Webhook GeniusPay → reussi (${paiement.reference})`,
  });

  return NextResponse.json({ success: true, statut: "reussi" });
}
