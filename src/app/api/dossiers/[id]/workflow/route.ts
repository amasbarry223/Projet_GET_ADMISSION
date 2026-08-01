import crypto from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { workflowSchema, validate } from "@/lib/validations";
import { hasPermission } from "@/lib/rbac";
import { notifyDossierTransition } from "@/lib/notifications";
import { sendMail, workflowEmailHtml } from "@/lib/mail";
import {
  ETAPE_PAR_ETAT,
  WORKFLOW_TRANSITIONS,
} from "@/lib/dossier/workflow";
import { APP_NAME, PAYMENT_STATUSES } from "@/shared/constants";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role;
  if (!role || role === "CANDIDAT") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = validate(workflowSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { action, note } = parsed.data;

  const rule = WORKFLOW_TRANSITIONS[action];
  if (!rule) {
    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  }

  // Financier uniquement pour confirmer le paiement
  if (action === "confirmer_paiement") {
    if (!hasPermission(role, "finance.write")) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
  } else if (rule.permission && !hasPermission(role, rule.permission)) {
    return NextResponse.json({ error: "Accès refusé pour ce rôle" }, { status: 403 });
  }

  const dossier = await db.dossier.findUnique({
    where: { id },
    include: { candidat: { select: { id: true, email: true, prenom: true, emailVerified: true } } },
  });
  if (!dossier) {
    return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
  }

  // Action « verifier » contextuelle
  let nouvelEtat = rule.to;
  if (action === "verifier") {
    if (dossier.etat === "SOUMIS") {
      nouvelEtat = "VERIFICATION";
    } else if (dossier.etat === "VERIFICATION") {
      nouvelEtat = "PAIEMENT_ATTENTE";
    } else {
      return NextResponse.json(
        { error: `Transition « verifier » impossible depuis ${dossier.etat}` },
        { status: 400 }
      );
    }
  } else if (!rule.from.includes(dossier.etat)) {
    return NextResponse.json(
      { error: `Transition impossible : état actuel ${dossier.etat}` },
      { status: 400 }
    );
  }

  // workflowStrict : interdire les raccourcis accepter/refuser depuis TRANSMIS
  if (action === "accepter" || action === "refuser") {
    const paramsAgence = await db.parametre.findUnique({
      where: { id: 1 },
      select: { workflowStrict: true },
    });
    if (paramsAgence?.workflowStrict !== false && dossier.etat === "TRANSMIS") {
      return NextResponse.json(
        {
          error:
            "Workflow strict : passez d'abord par « En attente de réponse » avant d'accepter ou refuser",
        },
        { status: 400 }
      );
    }
  }

  // Règle §6 : confirmer_paiement exige un solde réel encaissé
  if (action === "confirmer_paiement") {
    const totalPaye = await db.paiement.aggregate({
      where: { dossierId: id, statut: "reussi" },
      _sum: { montant: true },
    });
    const paye = totalPaye._sum.montant ?? 0;
    if (paye < dossier.fraisAgence) {
      return NextResponse.json(
        {
          error: `Solde insuffisant : ${paye} / ${dossier.fraisAgence} FCFA encaissés. Enregistrez les paiements avant de confirmer.`,
        },
        { status: 400 }
      );
    }
  }

  // Règle §6 : transmettre uniquement après paiement confirmé + encaissements
  if (action === "transmettre") {
    if (dossier.etat !== "PAIEMENT_CONFIRME") {
      return NextResponse.json(
        { error: "Le dossier doit être en « Paiement confirmé » avant transmission" },
        { status: 400 }
      );
    }
    if (dossier.paiementStatut !== PAYMENT_STATUSES.COMPLET) {
      return NextResponse.json(
        { error: "Transmission refusée : paiement des frais d'agence non confirmé" },
        { status: 400 }
      );
    }
    const totalPaye = await db.paiement.aggregate({
      where: { dossierId: id, statut: "reussi" },
      _sum: { montant: true },
    });
    if ((totalPaye._sum.montant ?? 0) < dossier.fraisAgence) {
      return NextResponse.json(
        { error: "Transmission refusée : aucun encaissement suffisant enregistré" },
        { status: 400 }
      );
    }
  }

  const updated = await db.dossier.update({
    where: { id },
    data: {
      etat: nouvelEtat,
      etapeActuelle: ETAPE_PAR_ETAT[nouvelEtat],
      ...(nouvelEtat === "PAIEMENT_CONFIRME"
        ? { paiementStatut: PAYMENT_STATUSES.COMPLET }
        : {}),
    },
  });

  if (nouvelEtat === "ATTESTATION") {
    const existing = await db.attestation.findUnique({ where: { dossierId: id } });
    if (!existing) {
      const reference = `ATT-${new Date().getFullYear()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
      const codeVerification = `VRF-${crypto.randomBytes(4).toString("hex").toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
      await db.attestation.create({
        data: {
          reference,
          codeVerification,
          dossierId: id,
          emetteurId: (session.user as { id: string }).id,
        },
      });
      const modele = await db.modeleAttestation.findFirst({
        where: { actif: true },
        orderBy: { ordre: "asc" },
      });
      if (modele) {
        await db.modeleAttestation.update({
          where: { id: modele.id },
          data: { nbUsages: { increment: 1 } },
        });
      }
    }
  }

  const noteFinale =
    note ||
    `Transition vers ${nouvelEtat.replace(/_/g, " ").toLowerCase()}`;

  await db.historique.create({
    data: {
      dossierId: id,
      etat: nouvelEtat,
      auteur: `${(session.user as { prenom: string }).prenom} ${(session.user as { nom: string }).nom}`,
      auteurId: (session.user as { id: string }).id,
      note: noteFinale,
    },
  });

  await logAudit({
    session,
    action: "WORKFLOW",
    resource: "dossier",
    resourceId: id,
    details: `Transition ${dossier.reference} → ${nouvelEtat}${note ? ` (${note})` : ""}`,
  });

  // Notifications in-app + e-mail
  try {
    await notifyDossierTransition({
      candidatId: dossier.candidatId,
      dossierId: id,
      reference: dossier.reference,
      nouvelEtat,
      note: noteFinale,
    });

    const paramsAgence = await db.parametre.findUnique({ where: { id: 1 } });
    if (paramsAgence?.notifEmail !== false && dossier.candidat.email) {
      await sendMail({
        to: dossier.candidat.email,
        subject: `${APP_NAME} — Dossier ${dossier.reference}`,
        html: workflowEmailHtml(
          dossier.candidat.prenom,
          dossier.reference,
          nouvelEtat.replace(/_/g, " ").toLowerCase(),
          noteFinale
        ),
      });
    }
  } catch (e) {
    console.error("[workflow] notif error", e);
  }

  const finalDossier = await db.dossier.findUnique({ where: { id } });
  return NextResponse.json({ success: true, dossier: finalDossier ?? updated });
}
