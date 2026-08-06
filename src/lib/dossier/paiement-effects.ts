import type { EtatDossier, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { createNotification, notifyDossierTransition } from "@/lib/notifications";
import { broadcastDossierLive } from "@/lib/dossier/live-broadcast";
import { sendMail, receiptEmailHtml } from "@/lib/mail";
import { formatFCFA, formatDate } from "@/lib/format";
import { logAudit } from "@/lib/audit";
import { ETAPE_PAR_ETAT, PAYMENT_STATUSES } from "@/shared/constants";

type Tx = Prisma.TransactionClient;

/** Verrouille la ligne dossier pour la durée de la transaction. */
export async function lockDossierRow(tx: Tx, dossierId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM "Dossier" WHERE id = ${dossierId} FOR UPDATE`;
}

export async function applyPaiementReussiInTx(
  tx: Tx,
  opts: {
    paiement: { id: string; reference: string; montant: number; moyen: string; dossierId: string };
    dossier: {
      id: string;
      etat: string;
      fraisAgence: number;
      candidatId: string;
      candidat: { email: string | null; prenom: string };
    };
    userId: string;
    auteurLabel: string;
  },
): Promise<{ etat: string; paiementStatut: string }> {
  const { paiement, dossier, userId, auteurLabel } = opts;
  const totalPaye = await tx.paiement.aggregate({
    where: { dossierId: dossier.id, statut: "reussi" },
    _sum: { montant: true },
  });
  const paye = totalPaye._sum.montant ?? 0;
  const paiementStatut =
    paye >= dossier.fraisAgence
      ? PAYMENT_STATUSES.COMPLET
      : paye > 0
        ? PAYMENT_STATUSES.PARTIEL
        : PAYMENT_STATUSES.AUCUN;

  const updateData: {
    paiementStatut: string;
    etat?: "TRANSMIS";
    etapeActuelle?: number;
  } = { paiementStatut };

  // Le solde complet a déjà été validé par le conseiller avant la mise en attente de paiement
  // (VERIFICATION → PAIEMENT_ATTENTE) : une fois les frais réglés, le dossier est transmis
  // automatiquement à l'université, sans étape manuelle supplémentaire.
  const autoTransmis = dossier.etat === "PAIEMENT_ATTENTE" && paiementStatut === PAYMENT_STATUSES.COMPLET;
  if (autoTransmis) {
    updateData.etat = "TRANSMIS";
    updateData.etapeActuelle = ETAPE_PAR_ETAT.TRANSMIS;
  }

  await tx.dossier.update({ where: { id: dossier.id }, data: updateData });

  await tx.historique.create({
    data: {
      dossierId: dossier.id,
      etat: (autoTransmis ? "PAIEMENT_CONFIRME" : dossier.etat) as EtatDossier,
      auteur: auteurLabel,
      auteurId: userId,
      note: `Paiement ${paiement.moyen} confirmé : ${paiement.montant} FCFA (${paiementStatut}).`,
    },
  });

  if (autoTransmis) {
    await tx.historique.create({
      data: {
        dossierId: dossier.id,
        etat: "TRANSMIS",
        auteur: auteurLabel,
        auteurId: userId,
        note: "Dossier transmis automatiquement à l'université après confirmation du paiement.",
      },
    });
  }

  return {
    etat: updateData.etat ?? dossier.etat,
    paiementStatut,
  };
}

/** Effets hors-transaction (notif, mail, broadcast) après commit. */
export async function afterPaiementReussiSideEffects(opts: {
  paiement: { id: string; reference: string; montant: number; dossierId: string };
  candidatId: string;
  candidat: { email: string | null; prenom: string };
  etat: string;
}) {
  await createNotification({
    userId: opts.candidatId,
    titre: "Paiement confirmé",
    message: `Votre paiement ${opts.paiement.reference} de ${opts.paiement.montant} FCFA a été confirmé.`,
    type: "paiement",
    lien: "/espace/paiement",
    dossierId: opts.paiement.dossierId,
  });

  void broadcastDossierLive({
    dossierId: opts.paiement.dossierId,
    candidatId: opts.candidatId,
    etat: opts.etat,
  });

  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const dossier = await db.dossier.findUnique({
    where: { id: opts.paiement.dossierId },
    select: { reference: true },
  });

  if (opts.candidat.email) {
    await sendMail({
      to: opts.candidat.email,
      subject: `Reçu ${opts.paiement.reference} — GET Admission`,
      html: receiptEmailHtml({
        prenom: opts.candidat.prenom,
        reference: opts.paiement.reference,
        montantLabel: formatFCFA(opts.paiement.montant),
        dateStr: formatDate(new Date().toISOString()),
        ...(dossier?.reference ? { dossierRef: dossier.reference } : {}),
        recuUrl: `${base}/api/recu/${opts.paiement.id}?format=pdf`,
        logoUrl: `${base}/images/brand/logo-get-admission.png`,
      }),
    });
  }

  // Paiement complet reçu pendant PAIEMENT_ATTENTE → dossier auto-transmis (cf. applyPaiementReussiInTx)
  if (opts.etat === "TRANSMIS" && dossier?.reference) {
    try {
      await notifyDossierTransition({
        candidatId: opts.candidatId,
        dossierId: opts.paiement.dossierId,
        reference: dossier.reference,
        nouvelEtat: "TRANSMIS",
        note: "Frais d'agence réglés — votre dossier a été transmis à l'université.",
      });
    } catch (e) {
      console.error("[paiement-effects] notifyDossierTransition TRANSMIS", e);
    }
    await logAudit({
      session: null,
      action: "WORKFLOW",
      resource: "dossier",
      resourceId: opts.paiement.dossierId,
      details: `Transition ${dossier.reference} → TRANSMIS (automatique après confirmation du paiement ${opts.paiement.reference})`,
    });
  }
}

export async function recomputePaiementStatutInTx(
  tx: Tx,
  dossier: { id: string; etat: string; fraisAgence: number },
  opts: { userId: string; auteurLabel: string; reason: "rembourse" | "echoue" },
): Promise<{ shouldRollback: boolean; paiementStatut: string }> {
  const totalPaye = await tx.paiement.aggregate({
    where: { dossierId: dossier.id, statut: "reussi" },
    _sum: { montant: true },
  });
  const paye = totalPaye._sum.montant ?? 0;
  const paiementStatut =
    paye >= dossier.fraisAgence
      ? PAYMENT_STATUSES.COMPLET
      : paye > 0
        ? PAYMENT_STATUSES.PARTIEL
        : PAYMENT_STATUSES.AUCUN;

  const shouldRollback =
    paiementStatut !== PAYMENT_STATUSES.COMPLET &&
    (dossier.etat === "PAIEMENT_CONFIRME" || dossier.etat === "PAIEMENT_ATTENTE");

  await tx.dossier.update({
    where: { id: dossier.id },
    data: {
      paiementStatut,
      ...(shouldRollback
        ? {
            etat: "PAIEMENT_ATTENTE" as const,
            etapeActuelle: ETAPE_PAR_ETAT.PAIEMENT_ATTENTE,
          }
        : {}),
    },
  });

  if (shouldRollback && dossier.etat === "PAIEMENT_CONFIRME") {
    await tx.historique.create({
      data: {
        dossierId: dossier.id,
        etat: "PAIEMENT_ATTENTE",
        auteur: opts.auteurLabel,
        auteurId: opts.userId,
        note: `Solde insuffisant après ${opts.reason} — retour en attente de paiement.`,
      },
    });
  }

  return { shouldRollback, paiementStatut };
}

/** Helper hors-tx pour les appels legacy (POST staff reussi hors PATCH). */
export async function applyPaiementReussi(opts: {
  paiement: { id: string; reference: string; montant: number; moyen: string; dossierId: string };
  dossier: {
    id: string;
    etat: string;
    fraisAgence: number;
    candidatId: string;
    candidat: { email: string | null; prenom: string };
  };
  userId: string;
  auteurLabel: string;
}) {
  const result = await db.$transaction(async (tx) => {
    await lockDossierRow(tx, opts.dossier.id);
    return applyPaiementReussiInTx(tx, opts);
  });
  await afterPaiementReussiSideEffects({
    paiement: opts.paiement,
    candidatId: opts.dossier.candidatId,
    candidat: opts.dossier.candidat,
    etat: result.etat,
  });
  return result;
}
