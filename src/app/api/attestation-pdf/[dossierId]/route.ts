import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { buildSimplePdf } from "@/lib/pdf";
import { requirePermission, isStaff } from "@/lib/rbac";
import { escapeHtml } from "@/lib/escape-html";

type DocPayload = {
  titreModele: string;
  descModele: string;
  reference: string;
  codeVerification: string;
  dateStr: string;
  candidat: string;
  formation: string;
  universite: string;
  dossierRef: string;
  modeRemiseLabel: string;
  emetteur: string;
  draft: boolean;
};

function buildPdfResponse(doc: DocPayload) {
  const lines = [
    doc.draft ? "*** APERCU BROUILLON — NON OFFICIEL ***" : "",
    `Modele: ${doc.titreModele}`,
    doc.descModele,
    "",
    `Reference: ${doc.reference}`,
    `Code verification: ${doc.codeVerification}`,
    `Date: ${doc.dateStr}`,
    "",
    `Candidat: ${doc.candidat}`,
    `Formation: ${doc.formation}`,
    `Universite: ${doc.universite}`,
    `Dossier: ${doc.dossierRef}`,
    `Mode remise: ${doc.modeRemiseLabel}`,
    `Emetteur: ${doc.emetteur}`,
    "",
    doc.draft
      ? "Document provisoire — emettez l'attestation pour obtenir le PDF officiel."
      : `Verifier sur /verifier?code=${doc.codeVerification}`,
  ].filter((l, i, arr) => !(l === "" && arr[i - 1] === ""));

  const pdf = buildSimplePdf(lines, doc.draft ? `APERCU — ${doc.titreModele}` : doc.titreModele);
  const filename = doc.draft ? `apercu-${doc.dossierRef}.pdf` : `${doc.reference}.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${doc.draft ? "inline" : "attachment"}; filename="${filename}"`,
    },
  });
}

function buildHtmlResponse(doc: DocPayload, autoPrint: boolean) {
  const watermark = doc.draft
    ? `<div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:0;overflow:hidden;">
        <span style="font-size:72px;font-weight:800;color:rgba(192,57,43,0.12);transform:rotate(-28deg);letter-spacing:0.08em;font-family:Georgia,serif;">APERÇU</span>
      </div>`
    : "";

  const banner = doc.draft
    ? `<p style="background:#FFF1F0;border:1px solid #FFCCC7;color:#C0392B;padding:10px 14px;border-radius:8px;font-size:13px;margin:0 0 24px;">
        Brouillon non officiel — émettez l'attestation pour le document définitif.
      </p>`
    : "";

  const e = escapeHtml;
  const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><title>${e(doc.reference)}</title>
<style>
  body{font-family:Georgia,"Times New Roman",serif;max-width:720px;margin:40px auto;padding:24px;color:#1A1A1A;position:relative;}
  h1{font-size:28px;margin:0 0 8px;color:#2E8329;}
  .meta{color:#6B7280;font-size:14px;margin:0 0 24px;}
  .card{border:1px solid #E5E7EB;border-radius:12px;padding:20px;background:#fff;position:relative;z-index:1;}
  .row{margin:8px 0;font-size:15px;}
  code{background:#F3F4F6;padding:2px 6px;border-radius:4px;font-size:13px;}
  a{color:#3CA936;}
</style>
</head>
<body>
  ${watermark}
  <div class="card">
    ${banner}
    <h1>${e(doc.titreModele)}</h1>
    <p class="meta">${e(doc.descModele)}</p>
    <p class="row"><strong>${e(doc.candidat)}</strong> — ${e(doc.formation)}</p>
    <p class="row">${e(doc.universite)}</p>
    <p class="row">Réf. <code>${e(doc.reference)}</code> · ${e(doc.dateStr)}</p>
    <p class="row">Code : <code>${e(doc.codeVerification)}</code></p>
    <p class="row">Mode de remise : ${e(doc.modeRemiseLabel)}</p>
    <p class="row">Émetteur : ${e(doc.emetteur)}</p>
    ${
      doc.draft
        ? ""
        : `<p class="row"><a href="/verifier?code=${encodeURIComponent(doc.codeVerification)}">Vérifier l'authenticité</a></p>`
    }
  </div>
  ${autoPrint && !doc.draft ? "<script>window.onload=()=>window.print()</script>" : ""}
</body></html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

// GET /api/attestation-pdf/[dossierId]?format=pdf|html&draft=1
export async function GET(
  request: Request,
  { params }: { params: Promise<{ dossierId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { dossierId } = await params;
  const url = new URL(request.url);
  const format = url.searchParams.get("format") || "pdf";
  const wantDraft = url.searchParams.get("draft") === "1";

  const role = (session.user as { role?: string }).role;
  const userId = (session.user as { id: string }).id;

  const [attestation, modele] = await Promise.all([
    db.attestation.findUnique({
      where: { dossierId },
      include: {
        emetteur: { select: { prenom: true, nom: true } },
        dossier: {
          include: {
            candidat: { select: { id: true, prenom: true, nom: true } },
            universite: { select: { nom: true, ville: true, pays: true } },
            formation: { select: { intitule: true, niveau: true } },
          },
        },
      },
    }),
    db.modeleAttestation.findFirst({
      where: { actif: true },
      orderBy: { ordre: "asc" },
    }),
  ]);

  const titreModele = modele?.nom ?? "Attestation de pré-inscription";
  const descModele = modele?.description ?? "Document officiel GET Admission";

  // —— Attestation émise (chemin nominal) ——
  if (attestation && !wantDraft) {
    if (role === "CANDIDAT") {
      if (attestation.dossier.candidat.id !== userId) {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      }
    } else {
      const gate = requirePermission(role, "attestations.read");
      if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const d = attestation.dossier;
    const dateStr = formatDate(
      attestation.dateEmission instanceof Date
        ? attestation.dateEmission.toISOString()
        : String(attestation.dateEmission),
    );
    const doc: DocPayload = {
      titreModele,
      descModele,
      reference: attestation.reference,
      codeVerification: attestation.codeVerification,
      dateStr,
      candidat: `${d.candidat.prenom} ${d.candidat.nom}`,
      formation: `${d.formation.intitule} (${d.formation.niveau})`,
      universite: `${d.universite.nom} — ${d.universite.ville}, ${d.universite.pays}`,
      dossierRef: d.reference,
      modeRemiseLabel:
        attestation.modeRemise === "agence" ? "Retrait à l'agence" : "Téléchargement",
      emetteur: `${attestation.emetteur.prenom} ${attestation.emetteur.nom}`,
      draft: false,
    };

    if (format === "html") return buildHtmlResponse(doc, url.searchParams.get("print") === "1");
    return buildPdfResponse(doc);
  }

  // —— Brouillon (staff only, PRE_ADMISSION ou ?draft=1) ——
  if (!isStaff(role)) {
    return NextResponse.json(
      { error: attestation ? "Utilisez le document émis" : "Attestation non trouvée" },
      { status: attestation ? 400 : 404 },
    );
  }

  const gate = requirePermission(role, "attestations.read");
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const dossier = await db.dossier.findUnique({
    where: { id: dossierId },
    include: {
      candidat: { select: { prenom: true, nom: true } },
      universite: { select: { nom: true, ville: true, pays: true } },
      formation: { select: { intitule: true, niveau: true } },
    },
  });

  if (!dossier) {
    return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
  }

  if (dossier.etat !== "PRE_ADMISSION" && dossier.etat !== "ATTESTATION" && dossier.etat !== "CLOTURE") {
    return NextResponse.json(
      { error: "Aperçu disponible uniquement à partir de la pré-admission." },
      { status: 400 },
    );
  }

  const staffName =
    `${(session.user as { prenom?: string }).prenom ?? ""} ${(session.user as { nom?: string }).nom ?? ""}`.trim() ||
    session.user.name ||
    "Conseiller GET";

  const doc: DocPayload = {
    titreModele,
    descModele,
    reference: `DRAFT-${dossier.reference}`,
    codeVerification: "———-APERCU———-",
    dateStr: formatDate(new Date().toISOString()),
    candidat: `${dossier.candidat.prenom} ${dossier.candidat.nom}`,
    formation: `${dossier.formation.intitule} (${dossier.formation.niveau})`,
    universite: `${dossier.universite.nom} — ${dossier.universite.ville}, ${dossier.universite.pays}`,
    dossierRef: dossier.reference,
    modeRemiseLabel: "À définir",
    emetteur: staffName,
    draft: true,
  };

  if (format === "html") return buildHtmlResponse(doc, false);
  return buildPdfResponse(doc);
}
