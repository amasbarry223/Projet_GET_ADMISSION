import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/admin/notifications — notifications dynamiques pour le staff
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const role = (session.user as any).role;
  if (role === "CANDIDAT") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const notifications: { id: string; type: string; message: string; reference: string; href: string; createdAt: string }[] = [];

  // 1. Dossiers en attente d'action (soumis, correction, paiement_attente)
  const dossiersAction = await db.dossier.findMany({
    where: { etat: { in: ["SOUMIS", "CORRECTION", "PAIEMENT_ATTENTE", "VERIFICATION"] } },
    include: { candidat: { select: { prenom: true, nom: true } } },
    take: 5,
    orderBy: { updatedAt: "desc" },
  });

  for (const d of dossiersAction) {
    const messages: Record<string, string> = {
      SOUMIS: `Nouveau dossier soumis par ${d.candidat.prenom} ${d.candidat.nom}`,
      CORRECTION: `Dossier ${d.reference} nécessite une correction`,
      PAIEMENT_ATTENTE: `Paiement en attente pour ${d.candidat.prenom} ${d.candidat.nom}`,
      VERIFICATION: `Dossier ${d.reference} en cours de vérification`,
    };
    notifications.push({
      id: `dossier-${d.id}`,
      type: "dossier",
      message: messages[d.etat] ?? `Dossier ${d.reference}`,
      reference: d.reference,
      href: `/admin/dossiers/${d.id}`,
      createdAt: d.updatedAt.toISOString(),
    });
  }

  // 2. Paiements échoués
  const paiementsEchoues = await db.paiement.findMany({
    where: { statut: "echoue" },
    include: { candidat: { select: { prenom: true, nom: true } }, dossier: { select: { reference: true } } },
    take: 3,
    orderBy: { date: "desc" },
  });

  for (const p of paiementsEchoues) {
    notifications.push({
      id: `paiement-${p.id}`,
      type: "paiement",
      message: `Paiement échoué — ${p.candidat.prenom} ${p.candidat.nom} (${p.dossier.reference})`,
      reference: p.reference,
      href: `/admin/finance`,
      createdAt: p.date.toISOString(),
    });
  }

  // 3. Messages non lus (côté conseiller)
  const conversationsNonLues = await db.conversation.findMany({
    where: { nonLusConseiller: { gt: 0 } },
    include: { candidat: { select: { prenom: true, nom: true } }, dossier: { select: { reference: true, id: true } } },
    take: 3,
    orderBy: { updatedAt: "desc" },
  });

  for (const c of conversationsNonLues) {
    notifications.push({
      id: `message-${c.id}`,
      type: "message",
      message: `${c.nonLusConseiller} message(s) non lu(s) de ${c.candidat.prenom} ${c.candidat.nom}`,
      reference: c.dossier.reference,
      href: `/admin/dossiers/${c.dossier.id}`,
      createdAt: c.updatedAt.toISOString(),
    });
  }

  // Trier par date (plus récent d'abord)
  notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({ notifications, count: notifications.length });
}
