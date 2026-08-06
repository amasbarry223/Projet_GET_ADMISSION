import { db } from "@/lib/db";
import { etatParCode } from "@/lib/etats";
import { broadcastDossierLive } from "@/lib/dossier/live-broadcast";
import { sendMail, workflowEmailHtml, attestationEmiseEmailHtml } from "@/lib/mail";
import { APP_NAME } from "@/shared/constants";

type CreateNotifInput = {
  userId: string;
  titre: string;
  message: string;
  type?: string;
  lien?: string | null;
  dossierId?: string | null;
};

/** Crée une notification in-app pour un utilisateur (respecte notifInApp) */
export async function createNotification(input: CreateNotifInput) {
  try {
    const params = await db.parametre.findUnique({ where: { id: 1 }, select: { notifInApp: true } });
    if (params && params.notifInApp === false) {
      return null;
    }
  } catch {
    /* continue — défaut = créer */
  }
  return db.notification.create({
    data: {
      userId: input.userId,
      titre: input.titre,
      message: input.message,
      type: input.type ?? "info",
      lien: input.lien ?? null,
      dossierId: input.dossierId ?? null,
    },
  });
}

/** Notifie le candidat d'un changement d'état (in-app + e-mail si activé). */
export async function notifyDossierTransition(opts: {
  candidatId: string;
  dossierId: string;
  reference: string;
  nouvelEtat: string;
  note?: string;
  /** Évite double e-mail si l'appelant l'envoie déjà */
  skipEmail?: boolean;
}) {
  const info = etatParCode(opts.nouvelEtat);
  const notif = await createNotification({
    userId: opts.candidatId,
    titre: `Dossier ${opts.reference} — ${info.libelle}`,
    message:
      opts.note ||
      `Étape ${info.ordre}/12 : ${info.description}`,
    type: "workflow",
    lien: "/espace",
    dossierId: opts.dossierId,
  });

  void broadcastDossierLive({
    dossierId: opts.dossierId,
    candidatId: opts.candidatId,
    etat: opts.nouvelEtat,
  });

  if (!opts.skipEmail) {
    try {
      const [params, candidat] = await Promise.all([
        db.parametre.findUnique({ where: { id: 1 }, select: { notifEmail: true } }),
        db.user.findUnique({
          where: { id: opts.candidatId },
          select: { email: true, prenom: true },
        }),
      ]);
      if (params?.notifEmail !== false && candidat?.email) {
        await sendMail({
          to: candidat.email,
          subject: `${APP_NAME} — Dossier ${opts.reference} · ${info.libelle}`,
          html: workflowEmailHtml(
            candidat.prenom,
            opts.reference,
            info.libelle,
            opts.note || info.description,
          ),
        });
      }
    } catch (e) {
      console.error("[notifyDossierTransition] email", e);
    }
  }

  return notif;
}

/** Notifie le candidat (in-app + e-mail, message de félicitations) que l'université a accordé la préinscription. */
export async function notifyAttestationEmise(opts: {
  candidatId: string;
  candidatEmail: string | null;
  candidatPrenom: string;
  dossierId: string;
  reference: string;
  universite: string;
  formation: string;
}) {
  await createNotification({
    userId: opts.candidatId,
    titre: "🎉 Félicitations — préinscription accordée",
    message: `${opts.universite} a accordé votre préinscription pour ${opts.formation}. Votre attestation est disponible.`,
    type: "workflow",
    lien: "/espace/attestation",
    dossierId: opts.dossierId,
  });

  void broadcastDossierLive({
    dossierId: opts.dossierId,
    candidatId: opts.candidatId,
    etat: "ATTESTATION",
  });

  if (!opts.candidatEmail) return;
  try {
    const params = await db.parametre.findUnique({ where: { id: 1 }, select: { notifEmail: true } });
    if (params?.notifEmail === false) return;
    const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
    await sendMail({
      to: opts.candidatEmail,
      subject: `🎉 Félicitations — préinscription accordée · GET Admission`,
      html: attestationEmiseEmailHtml({
        prenom: opts.candidatPrenom,
        reference: opts.reference,
        universite: opts.universite,
        formation: opts.formation,
        espaceUrl: `${base}/espace/attestation`,
        logoUrl: `${base}/images/brand/logo-get-admission.png`,
      }),
    });
  } catch (e) {
    console.error("[notifyAttestationEmise] email", e);
  }
}

/** Poste le motif d'une demande de correction dans la conversation du dossier (visible côté candidat). */
export async function postCorrectionMessage(opts: {
  dossierId: string;
  candidatId: string;
  conseillerId: string;
  motif: string;
}) {
  let conversation = await db.conversation.findUnique({ where: { dossierId: opts.dossierId } });
  if (!conversation) {
    conversation = await db.conversation.create({
      data: {
        dossierId: opts.dossierId,
        candidatId: opts.candidatId,
        conseillerId: opts.conseillerId,
      },
    });
  }

  await db.message.create({
    data: {
      conversationId: conversation.id,
      auteurId: opts.conseillerId,
      texte: `Correction demandée : ${opts.motif}`,
    },
  });

  await db.conversation.update({
    where: { id: conversation.id },
    data: { nonLusCandidat: { increment: 1 } },
  });
}

/** Notifie (in-app) tous les Admin et Super Admin qu'une correction a été demandée sur un dossier — rôle lecture seule sur cet événement. */
export async function notifyStaffCorrectionRequested(opts: {
  dossierId: string;
  reference: string;
  conseillerNom: string;
  motif: string;
}) {
  const destinataires = await db.user.findMany({
    where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, actif: true },
    select: { id: true },
  });

  await Promise.all(
    destinataires.map((u) =>
      createNotification({
        userId: u.id,
        titre: `Correction demandée — ${opts.reference}`,
        message: `${opts.conseillerNom} a demandé une correction sur le dossier ${opts.reference} : ${opts.motif}`,
        type: "workflow",
        lien: `/admin/dossiers/${opts.dossierId}`,
        dossierId: opts.dossierId,
      }),
    ),
  );
}

/** Notifie (in-app) les destinataires d'un nouveau message dans la messagerie interne Financier <-> Direction. */
export async function notifyMessageInterne(opts: {
  destinataireIds: string[];
  auteurNom: string;
  texte: string;
}) {
  const apercu = opts.texte.length > 140 ? `${opts.texte.slice(0, 140)}…` : opts.texte;
  await Promise.all(
    opts.destinataireIds.map((userId) =>
      createNotification({
        userId,
        titre: `Nouveau message de ${opts.auteurNom}`,
        message: apercu,
        type: "info",
        lien: "/admin/messages-internes",
      }),
    ),
  );
}
