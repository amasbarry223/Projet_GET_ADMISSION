import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { buildSimplePdf } from "@/lib/pdf";

// GET /api/attestation-pdf/[dossierId]?format=pdf|html
export async function GET(
  request: Request,
  { params }: { params: Promise<{ dossierId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { dossierId } = await params;
  const format = new URL(request.url).searchParams.get("format") || "pdf";

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

  if (!attestation) {
    return NextResponse.json({ error: "Attestation non trouvée" }, { status: 404 });
  }

  const role = (session.user as { role?: string }).role;
  const userId = (session.user as { id: string }).id;
  if (role === "CANDIDAT" && attestation.dossier.candidat.id !== userId) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const d = attestation.dossier;
  const dateStr = formatDate(
    attestation.dateEmission instanceof Date
      ? attestation.dateEmission.toISOString()
      : String(attestation.dateEmission)
  );

  const titreModele = modele?.nom ?? "Attestation de pre-inscription";
  const descModele = modele?.description ?? "Document officiel GET Admission";
  const modeRemiseLabel =
    attestation.modeRemise === "agence" ? "Retrait a l'agence" : "Telechargement";

  if (format === "pdf") {
    const pdf = buildSimplePdf(
      [
        `Modele: ${titreModele}`,
        descModele,
        "",
        `Reference: ${attestation.reference}`,
        `Code verification: ${attestation.codeVerification}`,
        `Date: ${dateStr}`,
        "",
        `Candidat: ${d.candidat.prenom} ${d.candidat.nom}`,
        `Formation: ${d.formation.intitule} (${d.formation.niveau})`,
        `Universite: ${d.universite.nom} — ${d.universite.ville}, ${d.universite.pays}`,
        `Dossier: ${d.reference}`,
        `Mode remise: ${modeRemiseLabel}`,
        `Emetteur: ${attestation.emetteur.prenom} ${attestation.emetteur.nom}`,
        "",
        `Verifier sur /verifier?code=${attestation.codeVerification}`,
      ],
      titreModele
    );

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${attestation.reference}.pdf"`,
      },
    });
  }

  const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><title>${attestation.reference}</title></head>
<body style="font-family:sans-serif;max-width:700px;margin:40px auto;padding:20px;">
  <h1>${titreModele}</h1>
  <p style="color:#666">${descModele}</p>
  <p><strong>${d.candidat.prenom} ${d.candidat.nom}</strong> — ${d.formation.intitule}</p>
  <p>${d.universite.nom} (${d.universite.ville}, ${d.universite.pays})</p>
  <p>Code : <code>${attestation.codeVerification}</code> · ${dateStr}</p>
  <p>Mode de remise : ${modeRemiseLabel}</p>
  <p>Émetteur : ${attestation.emetteur.prenom} ${attestation.emetteur.nom}</p>
  <p><a href="/verifier?code=${attestation.codeVerification}">Vérifier l'authenticité</a></p>
  <script>window.onload=()=>window.print()</script>
</body></html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
