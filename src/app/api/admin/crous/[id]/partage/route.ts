import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiPermission, parseOrRespond } from "@/lib/api-auth";
import { crousPartageSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";
import { sendMail, crousPartageEmailHtml } from "@/lib/mail";
import { fetchDemandeCrous, getAvailableAttachments, assemblePartageAttachments } from "@/lib/crous/partage";

const NON_EMAIL_MODE_MESSAGE: Record<string, string> = {
  lien: "Le partage par lien sécurisé temporaire n'est pas encore disponible.",
  pdf: "L'export PDF groupé n'est pas encore disponible.",
  zip: "L'export ZIP du dossier complet n'est pas encore disponible.",
};

// POST /api/admin/crous/[id]/partage — partage la demande CROUS (SUPER_ADMIN uniquement)
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiPermission("crous.manage");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const parsed = parseOrRespond(crousPartageSchema, await request.json().catch(() => null));
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;

  const demande = await fetchDemandeCrous(id);
  if (!demande) {
    return NextResponse.json({ error: "Demande CROUS non trouvée" }, { status: 404 });
  }

  const auteurNom = `${auth.user.prenom} ${auth.user.nom}`;

  // Modes non-email : stub V1, journalisé comme échec explicite (architecture extensible).
  if (input.mode !== "email") {
    const erreur = NON_EMAIL_MODE_MESSAGE[input.mode] ?? "Mode de partage non disponible.";
    await db.historiquePartageCrous.create({
      data: {
        demandeId: id,
        auteurId: auth.user.id,
        destinataire: input.destinataire,
        methode: input.mode,
        documents: JSON.stringify([]),
        statut: "echec",
        erreur,
      },
    });
    return NextResponse.json({ error: erreur }, { status: 501 });
  }

  const disponibilite = getAvailableAttachments(demande);
  const inclure = {
    infosCandidat: input.inclure.infosCandidat && disponibilite.infosCandidat,
    kyc: input.inclure.kyc && disponibilite.kyc,
    visa: input.inclure.visa && disponibilite.visa,
    accordPrealable: input.inclure.accordPrealable && disponibilite.accordPrealable,
    docsCrous: input.inclure.docsCrous && disponibilite.docsCrous,
  };

  const { attachments, labels } = await assemblePartageAttachments(demande, inclure, auteurNom);

  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const candidatNom = `${demande.dossier.candidat.prenom} ${demande.dossier.candidat.nom}`;

  const result = await sendMail({
    to: input.destinataire,
    subject: input.objet,
    html: crousPartageEmailHtml({
      message: input.message || "Veuillez trouver ci-joint les documents relatifs à cette demande CROUS.",
      dossierRef: demande.dossier.reference,
      candidat: candidatNom,
      labelsPieces: labels,
      logoUrl: `${base}/images/brand/logo-get-admission.png`,
    }),
    attachments,
  });

  await db.historiquePartageCrous.create({
    data: {
      demandeId: id,
      auteurId: auth.user.id,
      destinataire: input.destinataire,
      methode: "email",
      documents: JSON.stringify(labels),
      statut: result.ok ? "succes" : "echec",
      erreur: result.ok ? null : (result.error ?? "Erreur inconnue"),
    },
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error || "Échec de l'envoi de l'e-mail." },
      { status: 502 },
    );
  }

  await db.demandeCrous.update({ where: { id }, data: { statut: "PARTAGEE" } });

  await logAudit({
    session: auth.session,
    action: "UPDATE",
    resource: "crous",
    resourceId: id,
    details: `Partage par e-mail de la demande CROUS du dossier ${demande.dossier.reference} vers ${input.destinataire}`,
  });

  return NextResponse.json({ success: true, message: "Le dossier CROUS a été partagé avec succès." });
}
