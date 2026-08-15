import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  afterPaiementReussiSideEffects,
  applyPaiementReussiInTx,
  lockDossierRow,
} from "@/lib/dossier/paiement-effects";
import { broadcastDossierLive } from "@/lib/dossier/live-broadcast";
import { logAudit } from "@/lib/audit";

/**
 * POST /api/paiements/verify
 * Auto-confirme un paiement en ligne (GeniusPay / PayTech) lorsqu'un candidat revient
 * du guichet de paiement sécurisé avec un statut de succès.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: { reference?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const userId = session.user.id;
  const { reference } = body;

  const paiement = await db.paiement.findFirst({
    where: {
      candidatId: userId,
      ...(reference ? { reference } : {}),
    },
    include: {
      dossier: {
        include: { candidat: { select: { email: true, prenom: true } } },
      },
    },
    orderBy: { date: "desc" },
  });

  if (!paiement) {
    return NextResponse.json({ error: "Aucun paiement trouvé" }, { status: 404 });
  }

  if (paiement.statut === "reussi") {
    return NextResponse.json({
      success: true,
      statut: "reussi",
      paiement,
      receiptUrl: `/api/recu/${paiement.id}?format=pdf`,
    });
  }

  const auteurLabel = `${session.user.prenom} ${session.user.nom}`;

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
      userId,
      auteurLabel,
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
      candidatId: userId,
      candidat: result.dossier.candidat,
      etat: result.etat,
    });

    void broadcastDossierLive({
      dossierId: paiement.dossierId,
      candidatId: userId,
      etat: result.etat,
    });
  }

  await logAudit({
    session,
    action: "UPDATE",
    resource: "paiement",
    resourceId: paiement.id,
    details: `Auto-confirmation paiement en ligne (${paiement.reference})`,
  });

  return NextResponse.json({
    success: true,
    statut: "reussi",
    paiement: { ...paiement, statut: "reussi" },
    receiptUrl: `/api/recu/${paiement.id}?format=pdf`,
  });
}
