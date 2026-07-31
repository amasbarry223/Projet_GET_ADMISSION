import { db } from "@/lib/db";

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
  const libelle = opts.nouvelEtat.replace(/_/g, " ").toLowerCase();
  return createNotification({
    userId: opts.candidatId,
    titre: `Dossier ${opts.reference}`,
    message: opts.note || `Votre dossier est passé à l'état « ${libelle} ».`,
    type: "workflow",
    lien: "/espace",
    dossierId: opts.dossierId,
  });
}
