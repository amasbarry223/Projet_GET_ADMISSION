import { NextResponse } from "next/server";
import type { Prisma, PrismaClient } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { backupImportRequestSchema, validate } from "@/lib/validations";

const CONFIRM_PHRASE = "IMPORTER";
const BACKUP_APP_NAME = "GET Admission";

// Tables dont la clé primaire est un entier auto-incrémenté : la séquence Postgres doit
// être resynchronisée après un upsert avec id explicite (sinon collision au prochain insert).
const AUTOINCREMENT_TABLES = [
  "Statistique",
  "Temoignage",
  "MembreEquipe",
  "Faq",
  "Nationalite",
  "MoyenPaiement",
  "ObjetContact",
  "ContactMessage",
  "AuditLog",
  "EmailLog",
  "ContenuSection",
] as const;

type Tx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

/** Upsert générique ligne par ligne : ignore silencieusement les entrées sans `id`. */
async function restoreTable<TId extends string | number, TRow>(
  rows: unknown,
  upsert: (id: TId, row: TRow) => Promise<unknown>,
): Promise<number> {
  if (!Array.isArray(rows)) return 0;
  let count = 0;
  for (const raw of rows) {
    if (!raw || typeof raw !== "object" || !("id" in raw)) continue;
    const row = raw as TRow & { id: TId };
    await upsert(row.id, row);
    count++;
  }
  return count;
}

// POST /api/admin/backup/import — restaure une sauvegarde JSON (Super Admin uniquement)
//
// Fusion non destructive : les enregistrements dont l'id correspond à un enregistrement
// existant sont mis à jour, les autres sont créés. Rien n'est supprimé — les données déjà
// présentes en base mais absentes du fichier sont conservées.
export async function POST(request: Request) {
  const session = await getSession();
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

  const parsed = validate(backupImportRequestSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { confirm, backup } = parsed.data;

  if (confirm !== CONFIRM_PHRASE) {
    return NextResponse.json(
      { error: `Confirmation invalide. Saisissez exactement « ${CONFIRM_PHRASE} » pour continuer.` },
      { status: 400 },
    );
  }
  if (backup.meta.app !== BACKUP_APP_NAME) {
    return NextResponse.json(
      { error: "Ce fichier ne semble pas être une sauvegarde GET Admission." },
      { status: 400 },
    );
  }

  const b = backup as Record<string, unknown>;
  const counts: Record<string, number> = {};

  try {
    await db.$transaction(
      async (tx: Tx) => {
        counts.users = await restoreTable<string, Prisma.UserUncheckedCreateInput>(
          b.users,
          (id, row) => tx.user.upsert({ where: { id }, create: row, update: row }),
        );
        counts.universites = await restoreTable<string, Prisma.UniversiteUncheckedCreateInput>(
          b.universites,
          (id, row) => tx.universite.upsert({ where: { id }, create: row, update: row }),
        );
        counts.matriceVersions = await restoreTable<string, Prisma.MatriceVersionUncheckedCreateInput>(
          b.matriceVersions,
          (id, row) => tx.matriceVersion.upsert({ where: { id }, create: row, update: row }),
        );
        counts.matriceRegles = await restoreTable<string, Prisma.MatriceRegleUncheckedCreateInput>(
          b.matriceRegles,
          (id, row) => tx.matriceRegle.upsert({ where: { id }, create: row, update: row }),
        );
        counts.profilsAcademiques = await restoreTable<string, Prisma.ProfilAcademiqueUncheckedCreateInput>(
          b.profilsAcademiques,
          (id, row) => tx.profilAcademique.upsert({ where: { id }, create: row, update: row }),
        );
        counts.formations = await restoreTable<string, Prisma.FormationUncheckedCreateInput>(
          b.formations,
          (id, row) => tx.formation.upsert({ where: { id }, create: row, update: row }),
        );
        counts.parametres = await restoreTable<number, Prisma.ParametreUncheckedCreateInput>(
          b.parametres,
          (id, row) => tx.parametre.upsert({ where: { id }, create: row, update: row }),
        );
        counts.contenuSections = await restoreTable<number, Prisma.ContenuSectionUncheckedCreateInput>(
          b.contenuSections,
          (id, row) => tx.contenuSection.upsert({ where: { id }, create: row, update: row }),
        );
        counts.statistiques = await restoreTable<number, Prisma.StatistiqueUncheckedCreateInput>(
          b.statistiques,
          (id, row) => tx.statistique.upsert({ where: { id }, create: row, update: row }),
        );
        counts.temoignages = await restoreTable<number, Prisma.TemoignageUncheckedCreateInput>(
          b.temoignages,
          (id, row) => tx.temoignage.upsert({ where: { id }, create: row, update: row }),
        );
        counts.membresEquipe = await restoreTable<number, Prisma.MembreEquipeUncheckedCreateInput>(
          b.membresEquipe,
          (id, row) => tx.membreEquipe.upsert({ where: { id }, create: row, update: row }),
        );
        counts.faqs = await restoreTable<number, Prisma.FaqUncheckedCreateInput>(
          b.faqs,
          (id, row) => tx.faq.upsert({ where: { id }, create: row, update: row }),
        );
        counts.contactInfo = await restoreTable<number, Prisma.ContactInfoUncheckedCreateInput>(
          b.contactInfo,
          (id, row) => tx.contactInfo.upsert({ where: { id }, create: row, update: row }),
        );
        counts.nationalites = await restoreTable<number, Prisma.NationaliteUncheckedCreateInput>(
          b.nationalites,
          (id, row) => tx.nationalite.upsert({ where: { id }, create: row, update: row }),
        );
        counts.moyensPaiement = await restoreTable<number, Prisma.MoyenPaiementUncheckedCreateInput>(
          b.moyensPaiement,
          (id, row) => tx.moyenPaiement.upsert({ where: { id }, create: row, update: row }),
        );
        counts.objetsContact = await restoreTable<number, Prisma.ObjetContactUncheckedCreateInput>(
          b.objetsContact,
          (id, row) => tx.objetContact.upsert({ where: { id }, create: row, update: row }),
        );
        counts.contactMessages = await restoreTable<number, Prisma.ContactMessageUncheckedCreateInput>(
          b.contactMessages,
          (id, row) => tx.contactMessage.upsert({ where: { id }, create: row, update: row }),
        );

        counts.dossiers = await restoreTable<string, Prisma.DossierUncheckedCreateInput>(
          b.dossiers,
          (id, row) => tx.dossier.upsert({ where: { id }, create: row, update: row }),
        );
        counts.pieces = await restoreTable<string, Prisma.PieceUncheckedCreateInput>(
          b.pieces,
          (id, row) => tx.piece.upsert({ where: { id }, create: row, update: row }),
        );
        counts.historiques = await restoreTable<string, Prisma.HistoriqueUncheckedCreateInput>(
          b.historiques,
          (id, row) => tx.historique.upsert({ where: { id }, create: row, update: row }),
        );
        counts.demandesCorrection = await restoreTable<string, Prisma.DemandeCorrectionUncheckedCreateInput>(
          b.demandesCorrection,
          (id, row) => tx.demandeCorrection.upsert({ where: { id }, create: row, update: row }),
        );
        counts.paiements = await restoreTable<string, Prisma.PaiementUncheckedCreateInput>(
          b.paiements,
          (id, row) => tx.paiement.upsert({ where: { id }, create: row, update: row }),
        );
        counts.conversations = await restoreTable<string, Prisma.ConversationUncheckedCreateInput>(
          b.conversations,
          (id, row) => tx.conversation.upsert({ where: { id }, create: row, update: row }),
        );
        counts.messages = await restoreTable<string, Prisma.MessageUncheckedCreateInput>(
          b.messages,
          (id, row) => tx.message.upsert({ where: { id }, create: row, update: row }),
        );
        counts.conversationsInternes = await restoreTable<string, Prisma.ConversationInterneUncheckedCreateInput>(
          b.conversationsInternes,
          (id, row) => tx.conversationInterne.upsert({ where: { id }, create: row, update: row }),
        );
        counts.messagesInternes = await restoreTable<string, Prisma.MessageInterneUncheckedCreateInput>(
          b.messagesInternes,
          (id, row) => tx.messageInterne.upsert({ where: { id }, create: row, update: row }),
        );
        counts.demandesCrous = await restoreTable<string, Prisma.DemandeCrousUncheckedCreateInput>(
          b.demandesCrous,
          (id, row) => tx.demandeCrous.upsert({ where: { id }, create: row, update: row }),
        );
        counts.demandeCrousDocuments = await restoreTable<string, Prisma.DemandeCrousDocumentUncheckedCreateInput>(
          b.demandeCrousDocuments,
          (id, row) => tx.demandeCrousDocument.upsert({ where: { id }, create: row, update: row }),
        );
        counts.historiquesPartageCrous = await restoreTable<string, Prisma.HistoriquePartageCrousUncheckedCreateInput>(
          b.historiquesPartageCrous,
          (id, row) => tx.historiquePartageCrous.upsert({ where: { id }, create: row, update: row }),
        );
        counts.attestations = await restoreTable<string, Prisma.AttestationUncheckedCreateInput>(
          b.attestations,
          (id, row) => tx.attestation.upsert({ where: { id }, create: row, update: row }),
        );
        counts.notifications = await restoreTable<string, Prisma.NotificationUncheckedCreateInput>(
          b.notifications,
          (id, row) => tx.notification.upsert({ where: { id }, create: row, update: row }),
        );
        counts.auditLogs = await restoreTable<number, Prisma.AuditLogUncheckedCreateInput>(
          b.auditLogs,
          (id, row) => tx.auditLog.upsert({ where: { id }, create: row, update: row }),
        );
        counts.emailLogs = await restoreTable<number, Prisma.EmailLogUncheckedCreateInput>(
          b.emailLogs,
          (id, row) => tx.emailLog.upsert({ where: { id }, create: row, update: row }),
        );
        counts.logementReservations = await restoreTable<string, Prisma.LogementReservationUncheckedCreateInput>(
          b.logementReservations,
          (id, row) => tx.logementReservation.upsert({ where: { id }, create: row, update: row }),
        );
        counts.demandesLogementCrous = await restoreTable<string, Prisma.DemandeLogementCrousUncheckedCreateInput>(
          b.demandesLogementCrous,
          (id, row) => tx.demandeLogementCrous.upsert({ where: { id }, create: row, update: row }),
        );
      },
      { maxWait: 20_000, timeout: 280_000 },
    );
  } catch (e) {
    console.error("[admin/backup/import]", e);
    const message = e instanceof Error ? e.message : "Erreur inconnue";
    return NextResponse.json(
      { error: `Import échoué, aucune donnée n'a été modifiée (transaction annulée) : ${message}` },
      { status: 400 },
    );
  }

  // Resynchronise les séquences Postgres après upsert avec id explicite.
  // SÉCURITÉ : `table` est toujours une valeur de la constante statique AUTOINCREMENT_TABLES
  // définie en haut de ce fichier — aucune valeur utilisateur n'est interpolée ici.
  // Ne jamais remplacer `table` par une variable dont la valeur viendrait d'une requête HTTP.
  for (const table of AUTOINCREMENT_TABLES) {
    await db.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 1))`,
    );
  }

  const totalRestored = Object.values(counts).reduce((sum, n) => sum + n, 0);

  await logAudit({
    session,
    action: "UPDATE",
    resource: "parametre",
    details: `Import de sauvegarde JSON : ${totalRestored} enregistrement(s) restauré(s) (créés ou mis à jour).`,
  });

  return NextResponse.json({ success: true, counts, totalRestored });
}
