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
import { sendMail } from "@/lib/mail";
import { formatFCFA, formatDate } from "@/lib/format";
import { escapeHtml } from "@/lib/escape-html";
import { BRAND_COLORS } from "@/lib/brand";

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
    // Email de remboursement au candidat
    if (outcome.candidat.email) {
      const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const logoUrl = `${base}/images/brand/logo-get-admission.png`;
      void sendMail({
        to: outcome.candidat.email,
        subject: `GET Admission — Remboursement ${outcome.paiement.reference}`,
        html: `
          <div style="font-family:Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;color:${BRAND_COLORS.encre};background:${BRAND_COLORS.blanc}">
            <table role="presentation" width="100%" style="border-bottom:2px solid ${BRAND_COLORS.lapis};padding-bottom:18px;margin-bottom:24px">
              <tr><td align="center">
                <img src="${escapeHtml(logoUrl)}" alt="GET Admission" height="36" style="height:36px;width:auto;display:inline-block" />
              </td></tr>
            </table>
            <p style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${BRAND_COLORS.ardoise};margin:0 0 6px">Remboursement</p>
            <h1 style="font-size:21px;font-weight:700;margin:0 0 18px;color:${BRAND_COLORS.encre}">Votre paiement a été remboursé.</h1>
            <p style="font-size:14px">Bonjour ${escapeHtml(outcome.candidat.prenom)},</p>
            <p style="font-size:14px">
              Nous vous confirmons le remboursement du paiement
              <strong>${escapeHtml(outcome.paiement.reference)}</strong>
              d'un montant de <strong>${escapeHtml(formatFCFA(outcome.paiement.montant))}</strong>
              traité le ${escapeHtml(formatDate(new Date().toISOString()))}.
            </p>
            <p style="font-size:14px">
              Si vous avez des questions, n'hésitez pas à contacter l'équipe GET Admission.
            </p>
            <table role="presentation" width="100%" style="margin:26px 0">
              <tr><td align="center">
                <a href="${escapeHtml(`${base}/espace/paiement`)}" style="display:inline-block;background:${BRAND_COLORS.lapis};color:${BRAND_COLORS.blanc};text-decoration:none;font-weight:600;font-size:14px;padding:12px 30px;border-radius:6px">Voir mes paiements</a>
              </td></tr>
            </table>
            <p style="font-size:11px;color:${BRAND_COLORS.ardoise};text-align:center;margin-top:28px;border-top:1px solid ${BRAND_COLORS.porcelaine};padding-top:14px">GET Admission · Ce remboursement a été traité par notre équipe financière.</p>
          </div>
        `,
      });
    }
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
