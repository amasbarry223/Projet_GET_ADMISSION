import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseOrRespond } from "@/lib/api-auth";
import { paiementPatchSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { hasPermission } from "@/lib/rbac";
import { lockDossierRow, recomputePaiementStatutInTx } from "@/lib/dossier/paiement-effects";
import { broadcastDossierLive } from "@/lib/dossier/live-broadcast";
import { formatFCFA } from "@/lib/format";


// PATCH /api/paiements — rejeter / rembourser un paiement (staff finance). Un paiement ne devient
// jamais "reussi" via cette route : seul un webhook de passerelle vérifié (PayTech), la
// déclaration du candidat (/api/paiements/initiate), ou un encaissement hors ligne constaté par
// le staff (POST /api/admin/paiements) peuvent le faire — jamais un simple PATCH manuel.
export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const role = session.user.role;
  if (!hasPermission(role, "finance.write")) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const parsed = parseOrRespond(paiementPatchSchema, body);
  if (!parsed.ok) return parsed.response;
  const { id, statut } = parsed.data;

  const userId = session.user.id;
  const auteurLabel = `${session.user.prenom} ${session.user.nom}`;

  type PatchResult = {
    paiement: { id: string; reference: string; montant: number; moyen: string; dossierId: string; statut: string };
    candidatId: string;
    candidat: { email: string | null; prenom: string };
    etatApres?: string;
    sideEffect: "rembourse" | "echoue" | "none";
  };

  let outcome: PatchResult;
  try {
    outcome = await db.$transaction(async (tx) => {
      const existing = await tx.paiement.findUnique({ where: { id } });
      if (!existing) throw new Error("PAIEMENT_NOT_FOUND");

      const from = existing.statut;
      const allowed: Record<string, string[]> = {
        en_attente: ["echoue"],
        reussi: ["rembourse"],
        echoue: ["en_attente"],
        rembourse: [],
      };
      if (!(allowed[from] ?? []).includes(statut)) {
        throw new Error(`TRANSITION:${from}:${statut}`);
      }

      await lockDossierRow(tx, existing.dossierId);
      const dossierBefore = await tx.dossier.findUnique({
        where: { id: existing.dossierId },
        include: { candidat: { select: { email: true, prenom: true } } },
      });
      if (!dossierBefore) throw new Error("DOSSIER_NOT_FOUND");

      const postTransmission = [
        "TRANSMIS",
        "ATTENTE_REPONSE",
        "PRE_ADMISSION",
        "ATTESTATION",
        "CLOTURE",
        "REFUSE",
      ];
      if (
        (statut === "rembourse" || statut === "echoue") &&
        postTransmission.includes(dossierBefore.etat)
      ) {
        throw new Error("POST_TRANSMISSION");
      }

      const paiement = await tx.paiement.update({
        where: { id },
        data: { statut },
      });

      if (statut === "rembourse" || statut === "echoue") {
        await recomputePaiementStatutInTx(tx, dossierBefore, {
          userId,
          auteurLabel,
          reason: statut,
        });
        return {
          paiement,
          candidatId: dossierBefore.candidatId,
          candidat: dossierBefore.candidat,
          etatApres: dossierBefore.etat,
          sideEffect: statut as "rembourse" | "echoue",
        };
      }

      return {
        paiement,
        candidatId: dossierBefore.candidatId,
        candidat: dossierBefore.candidat,
        sideEffect: "none" as const,
      };
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "PAIEMENT_NOT_FOUND") {
      return NextResponse.json({ error: "Paiement non trouvé" }, { status: 404 });
    }
    if (msg === "DOSSIER_NOT_FOUND") {
      return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
    }
    if (msg === "POST_TRANSMISSION") {
      return NextResponse.json(
        {
          error:
            "Impossible de rembourser ou rejeter un paiement : le dossier a déjà été transmis ou clôturé. Annulez d'abord l'avancement workflow.",
        },
        { status: 400 },
      );
    }
    if (msg.startsWith("TRANSITION:")) {
      const [, from, to] = msg.split(":");
      return NextResponse.json(
        { error: `Transition paiement interdite : ${from} → ${to}` },
        { status: 400 },
      );
    }
    throw e;
  }

  if (outcome.sideEffect === "rembourse") {
    await createNotification({
      userId: outcome.candidatId,
      titre: "Remboursement effectué",
      message: `Le paiement ${outcome.paiement.reference} de ${formatFCFA(outcome.paiement.montant)} a été remboursé par l'agence.`,
      type: "paiement",
      lien: "/espace/paiement",
      dossierId: outcome.paiement.dossierId,
    });
    void broadcastDossierLive({
      dossierId: outcome.paiement.dossierId,
      candidatId: outcome.candidatId,
      etat: outcome.etatApres ?? "PAIEMENT_ATTENTE",
    });
  } else if (outcome.sideEffect === "echoue") {
    await createNotification({
      userId: outcome.candidatId,
      titre: "Paiement rejeté",
      message: `Le paiement ${outcome.paiement.reference} a été rejeté. Veuillez réessayer ou contacter l'agence.`,
      type: "alerte",
      lien: "/espace/paiement",
      dossierId: outcome.paiement.dossierId,
    });
    void broadcastDossierLive({
      dossierId: outcome.paiement.dossierId,
      candidatId: outcome.candidatId,
      etat: outcome.etatApres ?? "PAIEMENT_ATTENTE",
    });
  }

  await logAudit({
    session,
    action: "UPDATE",
    resource: "paiement",
    resourceId: id,
    details: `Statut paiement → ${statut}`,
  });

  return NextResponse.json({ success: true, paiement: outcome.paiement });
}

export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const role = session.user.role;
  const userId = session.user.id;

  let paiements;
  if (role === "CANDIDAT") {
    paiements = await db.paiement.findMany({
      where: { candidatId: userId },
      include: {
        dossier: { include: { universite: true, candidat: { select: { prenom: true, nom: true } } } },
      },
      orderBy: { date: "desc" },
    });
  } else {
    if (!hasPermission(role, "finance.read") && !hasPermission(role, "dossiers.read")) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
    paiements = await db.paiement.findMany({
      include: {
        dossier: { include: { universite: true, candidat: { select: { prenom: true, nom: true } } } },
      },
      orderBy: { date: "desc" },
    });
  }

  return NextResponse.json(paiements);
}
