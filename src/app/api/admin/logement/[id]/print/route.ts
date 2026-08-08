import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-auth";
import { formatDateTime } from "@/lib/format";
import { escapeHtml } from "@/lib/escape-html";

const CIVILITE_LABEL: Record<string, string> = { M: "Monsieur", MME: "Madame" };
const STATUT_LABEL: Record<string, string> = {
  soumis: "Soumise",
  en_cours_traitement: "En cours de traitement",
  correction_demandee: "Correction demandée au candidat",
};

// GET /api/admin/logement/[id]/print — vue imprimable d'une demande de logement
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiPermission("logement.read");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const r = await db.logementReservation.findUnique({
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
<title>Demande de logement — ${e(`${r.prenom} ${r.nom}`)}</title>
<style>
  body { font-family: 'General Sans', Inter, sans-serif; margin: 32px; color: #1A1A1A; }
  .header { text-align: center; border-bottom: 2px solid #3CA936; padding-bottom: 16px; margin-bottom: 20px; }
  .header img { height: 36px; }
  .header h1 { font-size: 20px; margin: 10px 0 0; }
  .header p { color: #6B7280; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px; }
  th, td { border: 1px solid #E5E7EB; padding: 7px 10px; text-align: left; }
  th { width: 260px; background: #F3F4F6; font-weight: 600; color: #374151; }
  .footer { margin-top: 20px; text-align: center; color: #6B7280; font-size: 10px; }
  @media print { body { margin: 0.5cm; } }
</style>
</head>
<body>
  <div class="header">
    <img src="/images/brand/logo-get-admission.png" alt="GET Admission" />
    <h1>Demande de réservation de logement</h1>
    <p>${e(`${r.prenom} ${r.nom}`)}</p>
  </div>
  <table>
    ${row("Civilité", CIVILITE_LABEL[r.civilite] ?? r.civilite)}
    ${row("Nom", r.nom)}
    ${row("Prénom", r.prenom)}
    ${row("Date de naissance", r.dateNaissance)}
    ${row("Nationalité", r.nationalite)}
    ${row("Téléphone", r.telephone)}
    ${row("E-mail", r.email)}
    ${r.agenceAccompagnante ? row("Agence accompagnante", r.agenceAccompagnante) : ""}
    ${row("N° passeport", r.numeroPasseport)}
    ${row("Pays de demande de visa", r.paysDemandeVisa)}
    ${row("Ville d'établissement (France)", r.villeEtablissementFrance)}
    ${row("Date d'arrivée prévue", r.dateArriveePrevue)}
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
