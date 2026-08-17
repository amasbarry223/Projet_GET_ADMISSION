import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiCandidat } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { notifyStaffDemandeRemboursement } from "@/lib/notifications";
import { formatFCFA } from "@/lib/format";
import { sendMail } from "@/lib/mail";
import { BRAND_COLORS } from "@/lib/brand";
import { escapeHtml } from "@/lib/escape-html";
import { z } from "zod";

const demandeSchema = z.object({
  motif: z.string().max(300, "Le motif ne doit pas dépasser 300 caractères").optional(),
});

// POST /api/paiements/[id]/demande-remboursement
// Permet à un candidat de solliciter le remboursement d'une transaction confirmée (statut "reussi").
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiCandidat();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const userId = auth.user.id;
  const candidatNom = `${auth.user.prenom} ${auth.user.nom}`;

  let motif: string | undefined;
  try {
    const json = await request.json().catch(() => ({}));
    const parsed = demandeSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Données invalides" },
        { status: 400 },
      );
    }
    motif = parsed.data.motif?.trim() || undefined;
  } catch {
    motif = undefined;
  }

  const paiement = await db.paiement.findUnique({
    where: { id },
    include: {
      dossier: {
        include: {
          candidat: { select: { id: true, email: true, prenom: true, nom: true } },
          universite: { select: { nom: true } },
        },
      },
    },
  });

  if (!paiement || paiement.candidatId !== userId) {
    return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });
  }

  if (paiement.statut !== "reussi") {
    return NextResponse.json(
      {
        error:
          paiement.statut === "rembourse"
            ? "Ce paiement a déjà été remboursé."
            : "Une demande de remboursement ne peut être effectuée que sur un paiement confirmé.",
      },
      { status: 400 },
    );
  }

  const dossier = paiement.dossier;
  const montantFormate = formatFCFA(paiement.montant);

  // 1. Ajouter une note dans l'historique du dossier
  await db.historique.create({
    data: {
      dossierId: dossier.id,
      etat: dossier.etat,
      auteur: candidatNom,
      auteurId: userId,
      note: `Demande de remboursement pour le paiement ${paiement.reference} (${montantFormate}).${motif ? ` Motif : ${motif}` : ""}`,
    },
  });

  // 2. Notifier le staff (Finance / Admin / Super Admin)
  await notifyStaffDemandeRemboursement({
    dossierId: dossier.id,
    dossierReference: dossier.reference,
    paiementReference: paiement.reference,
    montant: montantFormate,
    candidatNom,
    motif,
  });

  // 3. Email d'accusé de réception au candidat
  if (dossier.candidat.email) {
    const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const logoUrl = `${base}/images/brand/logo-get-admission.png`;

    void sendMail({
      to: dossier.candidat.email,
      subject: `GET Admission — Demande de remboursement reçue (${paiement.reference})`,
      html: `
        <div style="font-family:Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;color:${BRAND_COLORS.encre};background:${BRAND_COLORS.blanc}">
          <table role="presentation" width="100%" style="border-bottom:2px solid ${BRAND_COLORS.lapis};padding-bottom:18px;margin-bottom:24px">
            <tr><td align="center">
              <img src="${escapeHtml(logoUrl)}" alt="GET Admission" height="36" style="height:36px;width:auto;display:inline-block" />
            </td></tr>
          </table>
          <p style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${BRAND_COLORS.ardoise};margin:0 0 6px">Demande de remboursement</p>
          <h1 style="font-size:21px;font-weight:700;margin:0 0 18px;color:${BRAND_COLORS.encre}">Votre demande a bien été transmise.</h1>
          <p style="font-size:14px">Bonjour ${escapeHtml(dossier.candidat.prenom)},</p>
          <p style="font-size:14px">
            Nous avons bien enregistré votre demande de remboursement pour le paiement
            <strong>${escapeHtml(paiement.reference)}</strong> d'un montant de <strong>${escapeHtml(montantFormate)}</strong>
            associé au dossier <strong>${escapeHtml(dossier.reference)}</strong>.
          </p>
          ${
            motif
              ? `<p style="font-size:13px;background:${BRAND_COLORS.porcelaine};padding:12px;border-radius:6px;border-left:3px solid ${BRAND_COLORS.lapis}"><strong>Motif transmis :</strong> ${escapeHtml(motif)}</p>`
              : ""
          }
          <p style="font-size:14px">
            Notre équipe administrative et financière examinera votre demande dans les plus brefs délais et reviendra vers vous.
          </p>
          <table role="presentation" width="100%" style="margin:26px 0">
            <tr><td align="center">
              <a href="${escapeHtml(`${base}/espace/paiement`)}" style="display:inline-block;background:${BRAND_COLORS.lapis};color:${BRAND_COLORS.blanc};text-decoration:none;font-weight:600;font-size:14px;padding:12px 30px;border-radius:6px">Accéder à mes paiements</a>
            </td></tr>
          </table>
          <p style="font-size:11px;color:${BRAND_COLORS.ardoise};text-align:center;margin-top:28px;border-top:1px solid ${BRAND_COLORS.porcelaine};padding-top:14px">GET Admission · Service financier</p>
        </div>
      `,
    });
  }

  // 4. Journal d'audit
  await logAudit({
    session: auth.session,
    action: "CREATE",
    resource: "paiement",
    resourceId: id,
    details: `Demande de remboursement soumise par le candidat (${paiement.reference} - ${montantFormate})${motif ? ` : ${motif}` : ""}`,
  });

  return NextResponse.json({ success: true });
}
