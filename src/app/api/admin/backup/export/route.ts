import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

// GET /api/admin/backup/export — export JSON complet des données (Super Admin uniquement)
export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const gate = requirePermission(session.user.role, "backup.manage");
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const [
    users,
    universites,
    profilsAcademiques,
    formations,
    dossiers,
    pieces,
    historiques,
    paiements,
    conversations,
    messages,
    attestations,
    demandesCorrection,
    matriceVersions,
    matriceRegles,
    notifications,
    auditLogs,
    emailLogs,
    parametres,
    contenuSections,
    statistiques,
    temoignages,
    membresEquipe,
    faqs,
    contactInfo,
    nationalites,
    moyensPaiement,
    objetsContact,
    contactMessages,
    demandesCrous,
    demandeCrousDocuments,
    historiquesPartageCrous,
    conversationsInternes,
    messagesInternes,
    logementReservations,
    demandesLogementCrous,
  ] = await Promise.all([
    db.user.findMany({
      select: {
        id: true, email: true, prenom: true, nom: true, telephone: true, nationalite: true,
        dateNaissance: true, adresse: true, photoUrl: true, kycType: true, kycNumero: true,
        kycRectoPath: true, kycVersoPath: true, kycVerifie: true, kycVerifieLe: true,
        isDemo: true, emailVerified: true, lastLoginAt: true, role: true, actif: true,
        createdAt: true, updatedAt: true, supabaseUserId: true,
      },
    }),
    db.universite.findMany(),
    db.profilAcademique.findMany(),
    db.formation.findMany(),
    db.dossier.findMany(),
    db.piece.findMany(),
    db.historique.findMany(),
    db.paiement.findMany(),
    db.conversation.findMany(),
    db.message.findMany(),
    db.attestation.findMany(),
    db.demandeCorrection.findMany(),
    db.matriceVersion.findMany(),
    db.matriceRegle.findMany(),
    db.notification.findMany(),
    db.auditLog.findMany(),
    db.emailLog.findMany(),
    db.parametre.findMany(),
    db.contenuSection.findMany(),
    db.statistique.findMany(),
    db.temoignage.findMany(),
    db.membreEquipe.findMany(),
    db.faq.findMany(),
    db.contactInfo.findMany(),
    db.nationalite.findMany(),
    db.moyenPaiement.findMany(),
    db.objetContact.findMany(),
    db.contactMessage.findMany(),
    db.demandeCrous.findMany(),
    db.demandeCrousDocument.findMany(),
    db.historiquePartageCrous.findMany(),
    db.conversationInterne.findMany(),
    db.messageInterne.findMany(),
    db.logementReservation.findMany(),
    db.demandeLogementCrous.findMany(),
  ]);

  const backup = {
    meta: {
      app: "GET Admission",
      generatedAt: new Date().toISOString(),
      generatedBy: `${session.user.prenom} ${session.user.nom} (${session.user.email})`,
      version: 2,
      note: "Les champs sensibles (mot de passe, tokens) sont exclus de cet export.",
    },
    users,
    universites,
    profilsAcademiques,
    formations,
    dossiers,
    pieces,
    historiques,
    paiements,
    conversations,
    messages,
    attestations,
    demandesCorrection,
    matriceVersions,
    matriceRegles,
    notifications,
    auditLogs,
    emailLogs,
    parametres,
    contenuSections,
    statistiques,
    temoignages,
    membresEquipe,
    faqs,
    contactInfo,
    nationalites,
    moyensPaiement,
    objetsContact,
    contactMessages,
    demandesCrous,
    demandeCrousDocuments,
    historiquesPartageCrous,
    conversationsInternes,
    messagesInternes,
    logementReservations,
    demandesLogementCrous,
  };

  await logAudit({
    session,
    action: "CREATE",
    resource: "parametre",
    details: "Export JSON complet des données (sauvegarde)",
  });

  const filename = `getadmission-backup-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
