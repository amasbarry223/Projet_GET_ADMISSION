import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatFCFA, formatDate } from "@/lib/format";
import { requirePermission } from "@/lib/rbac";
import { escapeHtml } from "@/lib/escape-html";
import { buildReceiptPdfBuffer } from "@/lib/pdf/documents";
import { BRAND_COLORS, BRAND_LOGO } from "@/lib/brand";

// GET /api/recu/[id]?format=pdf|html — Reçu de paiement (BF-20)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const paiement = await db.paiement.findUnique({
    where: { id },
    include: {
      candidat: { select: { prenom: true, nom: true, email: true } },
      dossier: {
        select: {
          reference: true,
          fraisAgence: true,
          universite: { select: { nom: true, typeEtablissement: true } },
          formation: { select: { intitule: true } },
        },
      },
    },
  });

  if (!paiement) {
    return NextResponse.json({ error: "Paiement non trouvé" }, { status: 404 });
  }

  const role = session.user.role;
  const userId = session.user.id;
  if (role === "CANDIDAT") {
    if (paiement.candidatId !== userId) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
  } else {
    const gate = requirePermission(role, "finance.read");
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  if (paiement.statut !== "reussi") {
    return NextResponse.json(
      { error: "Le reçu n'est disponible qu'après confirmation du paiement" },
      { status: 403 }
    );
  }

  const format = new URL(request.url).searchParams.get("format") === "pdf" ? "pdf" : "html";
  const contactInfo = await db.contactInfo.findUnique({ where: { id: 1 } });

  if (format === "pdf") {
    const pdf = await buildReceiptPdfBuffer({
      reference: paiement.reference,
      dateStr: formatDate(paiement.date.toISOString()),
      candidat: `${paiement.candidat.prenom} ${paiement.candidat.nom}`,
      email: paiement.candidat.email,
      dossierRef: paiement.dossier.reference,
      universite: paiement.dossier.universite.nom,
      typeEtablissementLabel:
        paiement.dossier.universite.typeEtablissement === "PUBLIC" ? "Public" : "Privé",
      formation: paiement.dossier.formation.intitule,
      fraisAgenceLabel: formatFCFA(paiement.dossier.fraisAgence),
      moyenLabel: paiement.moyen + (paiement.tranche ? ` · ${paiement.tranche}` : ""),
      statutLabel: "Payé",
      montantLabel: formatFCFA(paiement.montant),
      generatedAtStr: formatDate(new Date().toISOString()),
      emailContact: contactInfo?.email,
      telephoneContact: contactInfo?.telephone,
    });
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${paiement.reference}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const e = escapeHtml;
  const moyenLabel = e(paiement.moyen) + (paiement.tranche ? ` · ${e(paiement.tranche)}` : "");
  const coordonnees = [contactInfo?.email, contactInfo?.telephone].filter(Boolean).map(e).join("  ·  ");
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Reçu ${e(paiement.reference)}</title>
<style>
  body { font-family: 'General Sans', Inter, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; color: ${BRAND_COLORS.encre}; }
  .header { display: flex; align-items: center; justify-content: space-between; gap: 16px; border-bottom: 2px solid ${BRAND_COLORS.lapis}; padding-bottom: 20px; margin-bottom: 30px; }
  .header img { height: 42px; width: auto; }
  .header-info { text-align: right; }
  .header-info .nom { font-size: 15px; font-weight: 700; margin: 0; }
  .header-info p { color: ${BRAND_COLORS.ardoise}; font-size: 11px; margin: 3px 0 0; }
  .recu { border: 1px solid ${BRAND_COLORS.ligne}; border-radius: 8px; padding: 24px; }
  .recu h2 { font-size: 18px; margin: 0 0 16px; }
  .section-label { font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: ${BRAND_COLORS.or}; font-weight: 700; margin: 18px 0 8px; }
  .section-label:first-of-type { margin-top: 0; }
  .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid ${BRAND_COLORS.porcelaine}; }
  .row:last-child { border-bottom: none; }
  .label { color: ${BRAND_COLORS.ardoise}; font-size: 14px; }
  .value { font-weight: 600; font-size: 14px; }
  .mono { font-family: 'Geist Mono', monospace; }
  .total { margin-top: 16px; padding: 12px 16px; background: ${BRAND_COLORS.orPale}; border-radius: 8px; display: flex; justify-content: space-between; }
  .total .value { font-size: 18px; color: ${BRAND_COLORS.or}; }
  .footer { margin-top: 30px; text-align: center; color: ${BRAND_COLORS.ardoise}; font-size: 11px; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
  <div class="header">
    <img src="${BRAND_LOGO.publicUrl}" alt="GET Admission" />
    <div class="header-info">
      <p class="nom">GET Admission</p>
      <p>Agence d'admission universitaire</p>
      ${coordonnees ? `<p>${coordonnees}</p>` : ""}
    </div>
  </div>
  <div class="recu">
    <h2>Reçu de paiement — <span class="mono">${e(paiement.reference)}</span></h2>

    <p class="section-label">Candidat &amp; dossier</p>
    <div class="row"><span class="label">Candidat</span><span class="value">${e(paiement.candidat.prenom)} ${e(paiement.candidat.nom)}</span></div>
    <div class="row"><span class="label">E-mail</span><span class="value">${e(paiement.candidat.email)}</span></div>
    <div class="row"><span class="label">Dossier</span><span class="value mono">${e(paiement.dossier.reference)}</span></div>
    <div class="row"><span class="label">Université</span><span class="value">${e(paiement.dossier.universite.nom)}</span></div>
    <div class="row"><span class="label">Type d'établissement</span><span class="value">${paiement.dossier.universite.typeEtablissement === "PUBLIC" ? "Public" : "Privé"}</span></div>
    <div class="row"><span class="label">Formation</span><span class="value">${e(paiement.dossier.formation.intitule)}</span></div>

    <p class="section-label">Paiement</p>
    <div class="row"><span class="label">Date</span><span class="value">${e(formatDate(paiement.date.toISOString()))}</span></div>
    <div class="row"><span class="label">Frais d'agence (référence)</span><span class="value mono">${e(formatFCFA(paiement.dossier.fraisAgence))}</span></div>
    <div class="row"><span class="label">Moyen de paiement</span><span class="value">${moyenLabel}</span></div>
    <div class="row"><span class="label">Statut</span><span class="value" style="color: ${BRAND_COLORS.lapis};">${e(paiement.statut)}</span></div>
    <div class="total"><span class="label">Montant payé</span><span class="value mono">${e(formatFCFA(paiement.montant))}</span></div>
  </div>
  <div class="footer">
    <p>GET Admission · Confidentiel</p>
    <p>Document généré électroniquement le ${e(formatDate(new Date().toISOString()))}</p>
  </div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
