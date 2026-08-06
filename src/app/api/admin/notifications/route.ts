import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";

/**
 * Persiste (une seule fois) une notification pour l'utilisateur courant : le dédoublonnage se fait
 * sur (userId, type, titre, message), donc une situation déjà notifiée puis marquée lue ne réapparaît
 * pas — seul un message réellement différent (nouvel état, nouveau décompte…) recrée une entrée.
 */
async function ensureNotif(
  userId: string,
  input: { type: string; titre: string; message: string; lien: string; dossierId?: string },
) {
  const existing = await db.notification.findFirst({
    where: { userId, type: input.type, titre: input.titre, message: input.message },
    select: { id: true },
  });
  if (existing) return;
  await db.notification.create({
    data: {
      userId,
      type: input.type,
      titre: input.titre,
      message: input.message,
      lien: input.lien,
      dossierId: input.dossierId ?? null,
    },
  });
}

const DOSSIER_ACTION_MESSAGE: Record<string, (nom: string, reference: string) => string> = {
  SOUMIS: (nom) => `Nouveau dossier soumis par ${nom}`,
  CORRECTION: (_nom, reference) => `Dossier ${reference} nécessite une correction`,
  PAIEMENT_ATTENTE: (nom) => `Paiement en attente pour ${nom}`,
  VERIFICATION: (_nom, reference) => `Dossier ${reference} en cours de vérification`,
};

// GET /api/admin/notifications — notifications du staff connecté (persistées + détectées).
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const gate = requirePermission(session.user.role, "dashboard");
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const userId = session.user.id;
  // Un conseiller ne doit voir que ce qui le concerne (dossiers qui lui sont affectés) — Admin,
  // Super Admin et Financier gardent la vue globale déjà en place.
  const isConseiller = session.user.role === "CONSEILLER";

  // 1. Dossiers en attente d'action
  const dossiersAction = await db.dossier.findMany({
    where: {
      etat: { in: ["SOUMIS", "CORRECTION", "PAIEMENT_ATTENTE", "VERIFICATION"] },
      ...(isConseiller ? { conseillerId: userId } : {}),
    },
    include: { candidat: { select: { prenom: true, nom: true } } },
    take: 5,
    orderBy: { updatedAt: "desc" },
  });
  for (const d of dossiersAction) {
    const buildMessage = DOSSIER_ACTION_MESSAGE[d.etat];
    if (!buildMessage) continue;
    await ensureNotif(userId, {
      type: "dossier",
      titre: d.reference,
      message: buildMessage(`${d.candidat.prenom} ${d.candidat.nom}`, d.reference),
      lien: `/admin/dossiers/${d.id}`,
      dossierId: d.id,
    });
  }

  // 2. Paiements échoués
  const paiementsEchoues = await db.paiement.findMany({
    where: {
      statut: "echoue",
      ...(isConseiller ? { dossier: { conseillerId: userId } } : {}),
    },
    include: { candidat: { select: { prenom: true, nom: true } }, dossier: { select: { reference: true } } },
    take: 3,
    orderBy: { date: "desc" },
  });
  for (const p of paiementsEchoues) {
    await ensureNotif(userId, {
      type: "paiement",
      titre: p.reference,
      message: `Paiement échoué — ${p.candidat.prenom} ${p.candidat.nom} (${p.dossier.reference})`,
      lien: "/admin/finance",
      dossierId: p.dossierId,
    });
  }

  // 3. Messages non lus (côté conseiller)
  const conversationsNonLues = await db.conversation.findMany({
    where: {
      nonLusConseiller: { gt: 0 },
      ...(isConseiller ? { conseillerId: userId } : {}),
    },
    include: { candidat: { select: { prenom: true, nom: true } }, dossier: { select: { reference: true, id: true } } },
    take: 3,
    orderBy: { updatedAt: "desc" },
  });
  for (const c of conversationsNonLues) {
    await ensureNotif(userId, {
      type: "message",
      titre: c.dossier.reference,
      // Le décompte fait partie du message : un nouveau message qui fait grimper le compteur change
      // ce texte et redonne donc lieu à une notification, même si la précédente a déjà été lue.
      message: `${c.nonLusConseiller} message(s) non lu(s) de ${c.candidat.prenom} ${c.candidat.nom}`,
      lien: `/admin/dossiers/${c.dossier.id}`,
      dossierId: c.dossier.id,
    });
  }

  const notifs = await db.notification.findMany({
    where: { userId, lu: false },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const notifications = notifs.map((n) => ({
    id: `notif-${n.id}`,
    type: n.type === "workflow" ? "correction" : n.type,
    message: n.message,
    reference: n.titre,
    href: n.lien ?? (n.dossierId ? `/admin/dossiers/${n.dossierId}` : "/admin"),
    createdAt: n.createdAt.toISOString(),
    notifId: n.id,
  }));

  return NextResponse.json({ notifications, count: notifications.length });
}
