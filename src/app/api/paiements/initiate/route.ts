import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { paiementSchema } from "@/lib/validations";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";
import { requireApiUser, parseOrRespond } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { randomBytes } from "node:crypto";
import { lockDossierRow } from "@/lib/dossier/paiement-effects";
import { initiatePaytechPayment, isPaytechConfigured } from "@/lib/paiement/paytech";
import { broadcastDossierLive } from "@/lib/dossier/live-broadcast";

/**
 * POST /api/paiements/initiate
 * Initie un paiement en ligne (PayTech) ou retombe en déclaration si non configuré.
 */
export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;

  const rateLimited = await checkRateLimit(getClientId(request), "/api/paiements/initiate");
  if (rateLimited) return rateLimited;

  if (auth.user.role !== "CANDIDAT") {
    return NextResponse.json({ error: "Réservé aux candidats" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = parseOrRespond(paiementSchema, body);
  if (!parsed.ok) return parsed.response;
  const { dossierId, montant, moyen, tranche } = parsed.data;
  const userId = auth.user.id;
  const auteurLabel = `${auth.user.prenom} ${auth.user.nom}`;

  const baseUrl = (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
  const ref = `REC-${new Date().getFullYear()}-${randomBytes(3).toString("hex").toUpperCase()}`;

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
          statut: "en_attente",
          tranche: tranche || "Solde",
        },
      });

      await tx.historique.create({
        data: {
          dossierId,
          etat: locked.etat,
          auteur: auteurLabel,
          auteurId: userId,
          note: isPaytechConfigured()
            ? `Paiement en ligne initié (${moyen}) : ${montant} FCFA — réf. ${ref}`
            : `Paiement ${moyen} déclaré : ${montant} FCFA — en attente de validation.`,
        },
      });

      return { paiement, locked };
    });

    const init = await initiatePaytechPayment({
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

    if (!init.ok) {
      await db.paiement.update({
        where: { id: created.paiement.id },
        data: { statut: "echoue" },
      });
      return NextResponse.json({ error: init.error }, { status: 502 });
    }

    await logAudit({
      session: auth.session,
      action: "CREATE",
      resource: "paiement",
      resourceId: created.paiement.id,
      details: `Init paiement ${ref} : ${montant} via ${moyen} (${init.mode})`,
    });

    await createNotification({
      userId,
      titre:
        init.mode === "paytech"
          ? "Paiement en ligne initié"
          : "Paiement en cours de validation",
      message:
        init.mode === "paytech"
          ? `Finalisez le paiement de ${montant} FCFA (réf. ${ref}).`
          : `Votre paiement ${ref} est en attente de confirmation par l'agence.`,
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
      mode: init.mode,
      pending: true,
      paiement: created.paiement,
      redirectUrl: init.mode === "paytech" ? init.redirectUrl : null,
      paytechConfigured: isPaytechConfigured(),
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
  return NextResponse.json({
    paytechConfigured: isPaytechConfigured(),
    provider: "paytech",
  });
}
