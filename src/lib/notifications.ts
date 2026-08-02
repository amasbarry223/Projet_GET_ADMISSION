import { db } from "@/lib/db";
import { etatParCode } from "@/lib/etats";
import { broadcastDossierLive } from "@/lib/dossier/live-broadcast";

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

/** Notifie le candidat d'un changement d'état de dossier */
export async function notifyDossierTransition(opts: {
  candidatId: string;
  dossierId: string;
  reference: string;
  nouvelEtat: string;
  note?: string;
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

  // Wake-up temps réel (Broadcast Supabase) — non bloquant
  void broadcastDossierLive({
    dossierId: opts.dossierId,
    candidatId: opts.candidatId,
    etat: opts.nouvelEtat,
  });

  return notif;
}
