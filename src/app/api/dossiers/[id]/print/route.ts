import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiPermission } from "@/lib/api-auth";
import { formatDateTime, formatFCFA } from "@/lib/format";
import { escapeHtml } from "@/lib/escape-html";
import { etatParCode } from "@/lib/etats";
import { BRAND_COLORS, BRAND_LOGO } from "@/lib/brand";

const PROCEDURE_LABEL: Record<string, string> = {
  PRIVEE: "Privée (choix candidat)",
  PUBLIQUE: "Publique (établissement affecté par l'agence)",
};

const PAIEMENT_STATUT_LABEL: Record<string, string> = {
  aucun: "Aucun paiement",
  partiel: "Partiel",
  complet: "Complet",
};

const PIECE_STATUT_LABEL: Record<string, string> = {
  manquante: "Manquante",
  televersee: "Téléversée",
  a_corriger: "À corriger",
  validee: "Validée",
};

// GET /api/dossiers/[id]/print — vue imprimable de la fiche dossier (Staff, dossiers.read)
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiPermission("dossiers.read");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const dossier = await db.dossier.findUnique({
    where: { id },
    include: {
      candidat: { select: { prenom: true, nom: true, email: true, telephone: true, nationalite: true } },
      universite: { select: { nom: true } },
      formation: { select: { intitule: true, niveau: true } },
      conseiller: { select: { prenom: true, nom: true } },
      pieces: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!dossier) {
    return NextResponse.json({ error: "Dossier introuvable" }, { status: 404 });
  }

  const e = escapeHtml;
  const row = (label: string, value: string) => `<tr><th>${e(label)}</th><td>${e(value)}</td></tr>`;
  const etat = etatParCode(dossier.etat);
  const candidatNom = `${dossier.candidat.prenom} ${dossier.candidat.nom}`;

  const piecesRows = dossier.pieces
    .map(
      (p) =>
        `<tr><td>${e(p.libelle)}</td><td>${e(PIECE_STATUT_LABEL[p.statut] ?? p.statut)}</td></tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Dossier — ${e(dossier.reference)}</title>
<style>
  body { font-family: 'General Sans', Inter, sans-serif; margin: 32px; color: ${BRAND_COLORS.encre}; }
  .header { text-align: center; border-bottom: 2px solid ${BRAND_COLORS.lapis}; padding-bottom: 16px; margin-bottom: 20px; }
  .header img { height: 36px; }
  .header h1 { font-size: 20px; margin: 10px 0 0; }
  .header p { color: ${BRAND_COLORS.ardoise}; font-size: 11px; }
  h2 { font-size: 14px; margin: 24px 0 8px; color: ${BRAND_COLORS.encre}; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 8px; }
  th, td { border: 1px solid ${BRAND_COLORS.ligne}; padding: 7px 10px; text-align: left; }
  th { width: 260px; background: ${BRAND_COLORS.porcelaine}; font-weight: 600; color: ${BRAND_COLORS.ardoise}; }
  .pieces th, .pieces td { width: auto; }
  .footer { margin-top: 20px; text-align: center; color: ${BRAND_COLORS.ardoise}; font-size: 10px; }
  @media print { body { margin: 0.5cm; } }
</style>
</head>
<body>
  <div class="header">
    <img src="${BRAND_LOGO.publicUrl}" alt="GET Admission" />
    <h1>Fiche dossier</h1>
    <p>${e(dossier.reference)} — ${e(candidatNom)}</p>
  </div>
  <table>
    ${row("Référence", dossier.reference)}
    ${row("Candidat", candidatNom)}
    ${row("E-mail", dossier.candidat.email)}
    ${row("Téléphone", dossier.candidat.telephone ?? "—")}
    ${row("Nationalité", dossier.candidat.nationalite ?? "—")}
    ${row("Procédure", PROCEDURE_LABEL[dossier.procedure] ?? dossier.procedure)}
    ${row("Université", dossier.universite.nom)}
    ${row("Formation", `${dossier.formation.niveau} · ${dossier.formation.intitule}`)}
    ${row("Conseiller affecté", dossier.conseiller ? `${dossier.conseiller.prenom} ${dossier.conseiller.nom}` : "Non affecté")}
    ${row("État actuel", `${etat.libelle} (étape ${dossier.etapeActuelle}/12)`)}
    ${row("Frais d'agence", formatFCFA(dossier.fraisAgence))}
    ${row("Statut paiement", PAIEMENT_STATUT_LABEL[dossier.paiementStatut] ?? dossier.paiementStatut)}
    ${row("Créé le", formatDateTime(dossier.createdAt.toISOString()))}
    ${row("Dernière mise à jour", formatDateTime(dossier.updatedAt.toISOString()))}
  </table>

  ${
    dossier.pieces.length > 0
      ? `<h2>Pièces du dossier (${dossier.pieces.length})</h2>
  <table class="pieces">
    <tr><th>Pièce</th><th>Statut</th></tr>
    ${piecesRows}
  </table>`
      : ""
  }

  <div class="footer">
    Généré par ${e(`${auth.user.prenom} ${auth.user.nom}`)} le ${e(formatDateTime(new Date().toISOString()))}
  </div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
