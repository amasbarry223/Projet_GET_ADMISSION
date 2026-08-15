import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { paiementSchema } from "@/lib/validations";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";
import { requireApiCandidat, parseOrRespond } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { randomBytes } from "node:crypto";
import { afterPaiementReussiSideEffects, applyPaiementReussiInTx, lockDossierRow } from "@/lib/dossier/paiement-effects";
import { initiatePaytechPayment, isPaytechConfigured } from "@/lib/paiement/paytech";
import { initiateGeniusPayPayment, isGeniusPayConfigured } from "@/lib/paiement/geniuspay";
import { broadcastDossierLive } from "@/lib/dossier/live-broadcast";

/**
 * POST /api/paiements/initiate
 * Initie un paiement en ligne (GeniusPay ou PayTech) ou retombe en déclaration si non configuré.
 */
export async function POST(request: Request) {
  const auth = await requireApiCandidat();
  if (!auth.ok) return auth.response;

  const rateLimited = await checkRateLimit(getClientId(request), "/api/paiements/initiate");
  if (rateLimited) return rateLimited;

  const body = await request.json();
  const parsed = parseOrRespond(paiementSchema, body);
  if (!parsed.ok) return parsed.response;
  const { dossierId, montant, moyen, tranche } = parsed.data;
  const userId = auth.user.id;
  const auteurLabel = `${auth.user.prenom} ${auth.user.nom}`;

  const baseUrl = (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
  const ref = `REC-${new Date().getFullYear()}-${randomBytes(3).toString("hex").toUpperCase()}`;
  
  const geniusPayConfigured = isGeniusPayConfigured();
  const paytechConfigured = isPaytechConfigured();
  const hasGatewayConfigured = geniusPayConfigured || paytechConfigured;

  try {
    const created = await db.$transaction(async (tx) => {
      await lockDossierRow(tx, dossierId);
      const locked = await tx.dossier.findUnique({
        where: { id: dossierId },
        include: { candidat: { select: { email: true, telephone: true, prenom: true } } },
      });
      if (!locked) throw new Error("DOSSIER_NOT_FOUND");
      if (locked.candidatId !== userId) throw new Error("FORBIDDEN");
      if (locked.etat !== "PAIEMENT_ATTENTE" && locked.etat !== "PAIEMENT_CONFIRME") {
        throw new Error("NOT_PAYABLE");
      }

      const [totalConfirme, totalPending] = await Promise.all([
        tx.paiement.aggregate({
          where: { dossierId: locked.id, statut: "reussi" },
          _sum: { montant: true },
        }),
        tx.paiement.aggregate({
          where: { dossierId: locked.id, statut: "en_attente" },
          _sum: { montant: true },
        }),
      ]);
      const engage =
        (totalConfirme._sum.montant ?? 0) + (totalPending._sum.montant ?? 0);
      const reste = Math.max(0, locked.fraisAgence - engage);
      if (reste <= 0) throw new Error("NO_RESTE");
      if (montant > reste) throw new Error(`RESTE:${reste}`);

      const paiement = await tx.paiement.create({
        data: {
          reference: ref,
          dossierId,
          candidatId: locked.candidatId,
          montant,
          moyen,
          statut: hasGatewayConfigured ? "en_attente" : "reussi",
          tranche: tranche || "Solde",
        },
      });

      await tx.historique.create({
        data: {
          dossierId,
          etat: locked.etat,
          auteur: auteurLabel,
          auteurId: userId,
          note: hasGatewayConfigured
            ? `Paiement en ligne initié (${moyen}) : ${montant} FCFA — réf. ${ref}`
            : `Paiement ${moyen} reçu et confirmé : ${montant} FCFA — réf. ${ref}.`,
        },
      });

      const applied = hasGatewayConfigured
        ? null
        : await applyPaiementReussiInTx(tx, {
            paiement: { id: paiement.id, reference: paiement.reference, montant: paiement.montant, moyen: paiement.moyen, dossierId },
            dossier: locked,
            userId,
            auteurLabel,
          });

      return { paiement, locked, applied };
    });

    // Pas de passerelle configurée : le paiement est déjà confirmé ci-dessus (déclaration directe).
    if (!hasGatewayConfigured) {
      const etatFinal = created.applied?.etat ?? created.locked.etat;

      await afterPaiementReussiSideEffects({
        paiement: {
          id: created.paiement.id,
          reference: created.paiement.reference,
          montant: created.paiement.montant,
          dossierId,
        },
        candidatId: userId,
        candidat: created.locked.candidat,
        etat: etatFinal,
      });

      await logAudit({
        session: auth.session,
        action: "CREATE",
        resource: "paiement",
        resourceId: created.paiement.id,
        details: `Paiement ${ref} confirmé automatiquement : ${montant} via ${moyen} (aucune passerelle configurée)`,
      });

      void broadcastDossierLive({ dossierId, candidatId: userId, etat: etatFinal });

      return NextResponse.json({
        success: true,
        mode: "declaration",
        pending: false,
        paiement: { ...created.paiement, statut: "reussi" },
        receiptUrl: `/api/recu/${created.paiement.id}?format=pdf`,
        redirectUrl: null,
        gatewayConfigured: false,
      });
    }

    // Si GeniusPay est configuré, on l'utilise en priorité
    if (geniusPayConfigured) {
      const initGenius = await initiateGeniusPayPayment({
        reference: ref,
        montant,
        libelle: `Frais agence GET Admission — ${ref}`,
        successUrl: `${baseUrl}/espace/paiement?status=success&ref=${encodeURIComponent(ref)}`,
        cancelUrl: `${baseUrl}/espace/paiement?status=cancel&ref=${encodeURIComponent(ref)}`,
        ipnUrl: `${baseUrl}/api/paiements/webhook/geniuspay`,
        customerName: `${auth.user.prenom} ${auth.user.nom}`,
        customerEmail: created.locked.candidat.email,
        customerPhone: created.locked.candidat.telephone,
        customField: created.paiement.id,
      });

      if (!initGenius.ok) {
        await db.paiement.update({
          where: { id: created.paiement.id },
          data: { statut: "echoue" },
        });
        return NextResponse.json({ error: initGenius.error }, { status: 502 });
      }

      if (initGenius.mode !== "geniuspay") {
        await db.paiement.update({
          where: { id: created.paiement.id },
          data: { statut: "echoue" },
        });
        return NextResponse.json(
          { error: "GeniusPay indisponible (clés API manquantes)." },
          { status: 502 }
        );
      }

      await logAudit({
        session: auth.session,
        action: "CREATE",
        resource: "paiement",
        resourceId: created.paiement.id,
        details: `Init paiement GeniusPay ${ref} : ${montant} via ${moyen}`,
      });

      await createNotification({
        userId,
        titre: "Paiement en ligne GeniusPay initié",
        message: `Finalisez le paiement de ${montant} FCFA (réf. ${ref}).`,
        type: "paiement",
        lien: "/espace/paiement",
        dossierId,
      });

      void broadcastDossierLive({
        dossierId,
        candidatId: userId,
        etat: created.locked.etat,
      });

      return NextResponse.json({
        success: true,
        mode: "geniuspay",
        pending: true,
        paiement: created.paiement,
        redirectUrl: initGenius.redirectUrl,
        provider: "geniuspay",
      });
    }

    // Repli sur PayTech si PayTech est configuré
    const initPaytech = await initiatePaytechPayment({
      reference: ref,
      montant,
      libelle: `Frais agence GET Admission — ${ref}`,
      successUrl: `${baseUrl}/espace/paiement?status=success&ref=${encodeURIComponent(ref)}`,
      cancelUrl: `${baseUrl}/espace/paiement?status=cancel&ref=${encodeURIComponent(ref)}`,
      ipnUrl: `${baseUrl}/api/paiements/webhook/paytech`,
      customerEmail: created.locked.candidat.email,
      customerPhone: created.locked.candidat.telephone,
      customField: created.paiement.id,
    });

    if (!initPaytech.ok) {
      await db.paiement.update({
        where: { id: created.paiement.id },
        data: { statut: "echoue" },
      });
      return NextResponse.json({ error: initPaytech.error }, { status: 502 });
    }

    if (initPaytech.mode !== "paytech") {
      await db.paiement.update({
        where: { id: created.paiement.id },
        data: { statut: "echoue" },
      });
      return NextResponse.json(
        { error: "PayTech indisponible (clés API manquantes)." },
        { status: 502 }
      );
    }

    await logAudit({
      session: auth.session,
      action: "CREATE",
      resource: "paiement",
      resourceId: created.paiement.id,
      details: `Init paiement PayTech ${ref} : ${montant} via ${moyen}`,
    });

    await createNotification({
      userId,
      titre: "Paiement en ligne initié",
      message: `Finalisez le paiement de ${montant} FCFA (réf. ${ref}).`,
      type: "paiement",
      lien: "/espace/paiement",
      dossierId,
    });

    void broadcastDossierLive({
      dossierId,
      candidatId: userId,
      etat: created.locked.etat,
    });

    return NextResponse.json({
      success: true,
      mode: "paytech",
      pending: true,
      paiement: created.paiement,
      redirectUrl: initPaytech.redirectUrl,
      provider: "paytech",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "DOSSIER_NOT_FOUND") {
      return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
    }
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
    if (msg === "NOT_PAYABLE") {
      return NextResponse.json(
        { error: "Dossier non encore en phase paiement" },
        { status: 403 },
      );
    }
    if (msg === "NO_RESTE") {
      return NextResponse.json(
        { error: "Aucun reste dû (paiements confirmés ou déjà en attente)" },
        { status: 400 },
      );
    }
    if (msg.startsWith("RESTE:")) {
      return NextResponse.json(
        { error: `Montant supérieur au reste dû (${msg.slice(6)} FCFA)` },
        { status: 400 },
      );
    }
    throw e;
  }
}

export async function GET() {
  const geniusPayConfigured = isGeniusPayConfigured();
  const paytechConfigured = isPaytechConfigured();

  return NextResponse.json({
    geniusPayConfigured,
    paytechConfigured,
    provider: geniusPayConfigured ? "geniuspay" : paytechConfigured ? "paytech" : "none",
  });
}
