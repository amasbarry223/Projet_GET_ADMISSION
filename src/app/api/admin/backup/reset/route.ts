import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

const CONFIRM_PHRASE = "REINITIALISER";

// POST /api/admin/backup/reset — réinitialise les données d'activité (Super Admin uniquement)
//
// Supprime : dossiers (+ pièces, historiques, paiements, attestations, conversations,
// messages, demandes de correction en cascade), notifications, journal d'audit.
// Conserve : catalogue (universités/formations), comptes utilisateurs, paramètres, contenu vitrine.
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const gate = requirePermission(session.user.role, "backup.manage");
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const confirm = (body as { confirm?: string })?.confirm;
  if (confirm !== CONFIRM_PHRASE) {
    return NextResponse.json(
      { error: `Confirmation invalide. Saisissez exactement « ${CONFIRM_PHRASE} » pour continuer.` },
      { status: 400 },
    );
  }

  const [dossiersCount, notificationsCount, auditLogsCount] = await Promise.all([
    db.dossier.count(),
    db.notification.count(),
    db.auditLog.count(),
  ]);

  await db.$transaction([
    db.notification.deleteMany({}),
    db.auditLog.deleteMany({}),
    // Cascade (onDelete: Cascade) : Piece, Historique, Paiement, Attestation,
    // Conversation (+ Message), DemandeCorrection.
    db.dossier.deleteMany({}),
  ]);

  // Journalisé après coup : le journal d'audit vient d'être vidé, cette entrée devient la première.
  await logAudit({
    session,
    action: "DELETE",
    resource: "dossier",
    details: `Réinitialisation des données d'activité : ${dossiersCount} dossier(s), ${notificationsCount} notification(s), ${auditLogsCount} entrée(s) d'audit supprimées.`,
  });

  return NextResponse.json({
    success: true,
    deleted: { dossiers: dossiersCount, notifications: notificationsCount, auditLogs: auditLogsCount },
  });
}
