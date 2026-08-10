import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { workflowSchema } from "@/lib/validations";
import { requireApiUser, parseOrRespond } from "@/lib/api-auth";
import { hasPermission } from "@/lib/rbac";
import {
  notifyDossierTransition,
  notifyStaffCorrectionRequested,
  postCorrectionMessage,
} from "@/lib/notifications";
import {
  requestCorrection,
  markCorrectionSubmitted,
  markCorrectionValidated,
} from "@/lib/dossier/correction";
import {
  ETAPE_PAR_ETAT,
  WORKFLOW_TRANSITIONS,
} from "@/lib/dossier/workflow";
import { PAYMENT_STATUSES } from "@/shared/constants";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { role } = auth.user;
  if (role === "CANDIDAT") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = parseOrRespond(workflowSchema, body);
  if (!parsed.ok) return parsed.response;
  const { action, note } = parsed.data;

  const rule = WORKFLOW_TRANSITIONS[action];
  if (!rule) {
    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  }

  if (rule.permission && !hasPermission(role, rule.permission)) {
    return NextResponse.json({ error: "Accès refusé pour ce rôle" }, { status: 403 });
  }

  const dossier = await db.dossier.findUnique({
    where: { id },
    include: {
      candidat: { select: { id: true, email: true, prenom: true, emailVerified: true } },
      universite: { select: { estPlaceholder: true } },
    },
  });
  if (!dossier) {
    return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
  }

  // Le conseiller ne peut agir que sur les dossiers qui lui sont affectés.
  if (role === "CONSEILLER" && dossier.conseillerId !== auth.user.id) {
    return NextResponse.json({ error: "Accès refusé — ce dossier ne vous est pas affecté" }, { status: 403 });
  }

  // Une fois le dossier affecté à un conseiller et accepté par celui-ci (état !== SOUMIS && état !== BROUILLON),
  // l'Admin et le Super Admin ne peuvent plus valider le dossier ni demander des corrections.
  const isValidationOrCorrection =
    action === "valider_dossier" ||
    action === "verifier_corrections" ||
    (action === "correction" && dossier.etat !== "SOUMIS") ||
    (action === "verifier" && dossier.etat === "VERIFICATION");

  const isAcceptedByConseiller =
    dossier.conseillerId !== null && dossier.etat !== "SOUMIS" && dossier.etat !== "BROUILLON";

  if ((role === "ADMIN" || role === "SUPER_ADMIN") && isAcceptedByConseiller && isValidationOrCorrection) {
    return NextResponse.json(
      {
        error:
          "Accès refusé — ce dossier a été accepté par le conseiller affecté. L'administration ne peut plus le valider ni demander de corrections.",
      },
      { status: 403 }
    );
  }


  // États sources attendus pour updateMany conditionnel
  const fromStates =
    action === "verifier"
      ? dossier.etat === "SOUMIS"
        ? (["SOUMIS"] as const)
        : dossier.etat === "VERIFICATION"
          ? (["VERIFICATION"] as const)
          : null
      : rule.from;

  if (action === "verifier" && !fromStates) {
    return NextResponse.json(
      { error: `Transition « verifier » impossible depuis ${dossier.etat}` },
      { status: 400 },
    );
  }

  // Action « verifier » contextuelle
  let nouvelEtat = rule.to;
  if (action === "verifier") {
    if (dossier.etat === "SOUMIS") {
      nouvelEtat = "VERIFICATION";
    } else if (dossier.etat === "VERIFICATION") {
      nouvelEtat = "PAIEMENT_ATTENTE";
    }
  } else if (!rule.from.includes(dossier.etat)) {
    return NextResponse.json(
      { error: `Transition impossible : état actuel ${dossier.etat}` },
      { status: 400 },
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
        { status: 400 },
      );
    }
  }

  // Règle §6 : transmettre uniquement après paiement confirmé + encaissements
  if (action === "transmettre") {
    if (dossier.etat !== "PAIEMENT_CONFIRME") {
      return NextResponse.json(
        { error: "Le dossier doit être en « Paiement confirmé » avant transmission" },
        { status: 400 },
      );
    }
    if (dossier.procedure === "PUBLIQUE" && dossier.universite.estPlaceholder) {
      return NextResponse.json(
        { error: "Affectez d'abord un établissement public avant de transmettre le dossier." },
        { status: 400 },
      );
    }
    if (dossier.paiementStatut !== PAYMENT_STATUSES.COMPLET) {
      return NextResponse.json(
        { error: "Transmission refusée : paiement des frais d'agence non confirmé" },
        { status: 400 },
      );
    }
    const totalPaye = await db.paiement.aggregate({
      where: { dossierId: id, statut: "reussi" },
      _sum: { montant: true },
    });
    if ((totalPaye._sum.montant ?? 0) < dossier.fraisAgence) {
      return NextResponse.json(
        { error: "Transmission refusée : aucun encaissement suffisant enregistré" },
        { status: 400 },
      );
    }
  }

  const expectedFrom = [...(fromStates ?? rule.from)];
  const locked = await db.dossier.updateMany({
    where: { id, etat: { in: expectedFrom } },
    data: {
      etat: nouvelEtat,
      etapeActuelle: ETAPE_PAR_ETAT[nouvelEtat],
    },
  });
  if (locked.count === 0) {
    return NextResponse.json(
      {
        error:
          "Le dossier a déjà changé d'état (course concurrente). Actualisez la page et réessayez.",
        code: "WORKFLOW_RACE",
      },
      { status: 409 },
    );
  }

  const updated = await db.dossier.findUnique({ where: { id } });
  if (!updated) {
    return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
  }

  const noteFinale =
    note ||
    `Transition vers ${nouvelEtat.replace(/_/g, " ").toLowerCase()}`;

  await db.historique.create({
    data: {
      dossierId: id,
      etat: nouvelEtat,
      auteur: `${auth.user.prenom} ${auth.user.nom}`,
      auteurId: auth.user.id,
      note: noteFinale,
    },
  });

  await logAudit({
    session: auth.session,
    action: "WORKFLOW",
    resource: "dossier",
    resourceId: id,
    details: `Transition ${dossier.reference} → ${nouvelEtat}${note ? ` (${note})` : ""}`,
  });

  // Boucle correction ↔ vérification : traçabilité + notifications dédiées
  if (action === "correction") {
    try {
      const auteurNom = `${auth.user.prenom} ${auth.user.nom}`;
      const motif = (note ?? "").trim();
      await requestCorrection(db, {
        dossierId: id,
        conseillerId: auth.user.id,
        motif,
      });
      await postCorrectionMessage({
        dossierId: id,
        candidatId: dossier.candidatId,
        conseillerId: auth.user.id,
        motif,
      });
      await notifyStaffCorrectionRequested({
        dossierId: id,
        reference: dossier.reference,
        conseillerNom: auteurNom,
        motif,
      });
    } catch (e) {
      console.error("[workflow] correction request error", e);
    }
  } else if (action === "verifier_corrections") {
    try {
      await markCorrectionSubmitted(db, id);
    } catch (e) {
      console.error("[workflow] correction submitted error", e);
    }
  } else if (nouvelEtat === "PAIEMENT_ATTENTE") {
    // Sortie de VERIFICATION vers l'avant = correction jugée conforme par le conseiller
    try {
      await markCorrectionValidated(db, id);
    } catch (e) {
      console.error("[workflow] correction validated error", e);
    }
  }

  // Notifications in-app + e-mail (via notifyDossierTransition)
  try {
    await notifyDossierTransition({
      candidatId: dossier.candidatId,
      dossierId: id,
      reference: dossier.reference,
      nouvelEtat,
      note: noteFinale,
    });
  } catch (e) {
    console.error("[workflow] notif error", e);
  }

  const finalDossier = await db.dossier.findUnique({ where: { id } });
  return NextResponse.json({ success: true, dossier: finalDossier ?? updated });
}
