import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseOrRespond } from "@/lib/api-auth";
import { verifyPaytechIpn } from "@/lib/paiement/paytech";
import { paytechIpnSchema } from "@/lib/validations";
import {
  afterPaiementReussiSideEffects,
  applyPaiementReussiInTx,
  lockDossierRow,
} from "@/lib/dossier/paiement-effects";
import { logAudit } from "@/lib/audit";

/**
 * POST /api/paiements/webhook/paytech — IPN PayTech (sans session).
 */
export async function POST(request: Request) {
  let payload: Record<string, unknown> = {};
  const contentType = request.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/json")) {
      payload = (await request.json()) as Record<string, unknown>;
    } else {
      const form = await request.formData();
      form.forEach((value, key) => {
        payload[key] = typeof value === "string" ? value : value.name;
      });
    }
  } catch {
    return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
  }

  const validated = parseOrRespond(paytechIpnSchema, payload);
  if (!validated.ok) return validated.response;

  const verified = verifyPaytechIpn(validated.data as Record<string, unknown>);
  if (!verified.ok) {
    return NextResponse.json(
      { error: "Notification non authentifiée ou référence manquante" },
      { status: 403 },
    );
  }

  const paiement = await db.paiement.findFirst({
    where: {
      OR: [
        { reference: verified.reference },
        { id: String(payload.custom_field || "") },
      ],
    },
    include: {
      dossier: {
        include: { candidat: { select: { email: true, prenom: true } } },
      },
    },
  });

  if (!paiement) {
    return NextResponse.json({ error: "Paiement inconnu" }, { status: 404 });
  }

  if (paiement.statut === "reussi") {
    return NextResponse.json({ success: true, idempotent: true });
  }

  if (!verified.success) {
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
        moyen: paiement.moyen,
        dossierId: paiement.dossierId,
      },
      dossier,
      userId: "systeme-paytech",
      auteurLabel: "PayTech",
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
  }

  await logAudit({
    session: null,
    action: "UPDATE",
    resource: "paiement",
    resourceId: paiement.id,
    details: `IPN PayTech → reussi (${paiement.reference})`,
  });

  return NextResponse.json({ success: true, statut: "reussi" });
}
