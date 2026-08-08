import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-auth";
import { formatDateTime } from "@/lib/format";
import { escapeHtml } from "@/lib/escape-html";
import { BRAND_COLORS, BRAND_LOGO } from "@/lib/brand";

const SEXE_LABEL: Record<string, string> = { M: "Masculin", F: "Féminin" };
const STATUT_LABEL: Record<string, string> = {
  soumis: "Soumise",
  en_cours_traitement: "En cours de traitement",
  correction_demandee: "Correction demandée au candidat",
};

// GET /api/admin/logement/crous/[id]/print — vue imprimable d'une demande de logement CROUS
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiPermission("logement.read");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const r = await db.demandeLogementCrous.findUnique({
    where: { id },
    include: { candidat: { select: { email: true } } },
  });
  if (!r) {
    return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  }

  const e = escapeHtml;
  const row = (label: string, value: string) => `<tr><th>${e(label)}</th><td>${e(value)}</td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Demande de logement CROUS — ${e(`${r.prenom} ${r.nom}`)}</title>
<style>
  body { font-family: 'General Sans', Inter, sans-serif; margin: 32px; color: ${BRAND_COLORS.encre}; }
  .header { text-align: center; border-bottom: 2px solid ${BRAND_COLORS.lapis}; padding-bottom: 16px; margin-bottom: 20px; }
  .header img { height: 36px; }
  .header h1 { font-size: 20px; margin: 10px 0 0; }
  .header p { color: ${BRAND_COLORS.ardoise}; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px; }
  th, td { border: 1px solid ${BRAND_COLORS.ligne}; padding: 7px 10px; text-align: left; }
  th { width: 260px; background: ${BRAND_COLORS.porcelaine}; font-weight: 600; color: ${BRAND_COLORS.ardoise}; }
  .footer { margin-top: 20px; text-align: center; color: ${BRAND_COLORS.ardoise}; font-size: 10px; }
  @media print { body { margin: 0.5cm; } }
</style>
</head>
<body>
  <div class="header">
    <img src="${BRAND_LOGO.publicUrl}" alt="GET Admission" />
    <h1>Demande de logement CROUS</h1>
    <p>${e(`${r.prenom} ${r.nom}`)}</p>
  </div>
  <table>
    ${row("Nom", r.nom)}
    ${row("Prénom", r.prenom)}
    ${r.nomUsage ? row("Nom d'usage", r.nomUsage) : ""}
    ${row("Date de naissance", r.dateNaissance)}
    ${row("Lieu de naissance", r.lieuNaissance)}
    ${row("Pays de naissance", r.paysNaissance)}
    ${row("Nationalité", r.nationalite)}
    ${row("Sexe", SEXE_LABEL[r.sexe] ?? r.sexe)}
    ${row("Téléphone", r.telephone)}
    ${row("E-mail", r.email)}
    ${row("Ville d'établissement (France)", r.villeEtablissementFrance)}
    ${row("Statut", STATUT_LABEL[r.statut] ?? r.statut)}
    ${r.motifCorrection ? row("Motif de correction", r.motifCorrection) : ""}
    ${row("Soumise le", formatDateTime(r.createdAt.toISOString()))}
  </table>
  <div class="footer">
    Généré par ${e(`${auth.user.prenom} ${auth.user.nom}`)} le ${e(formatDateTime(new Date().toISOString()))}
  </div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
