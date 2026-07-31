import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatFCFA, formatDate } from "@/lib/format";
import { requirePermission } from "@/lib/rbac";

// GET /api/recu/[id] — Reçu de paiement (HTML imprimable)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const paiement = await db.paiement.findUnique({
    where: { id },
    include: {
      candidat: { select: { prenom: true, nom: true, email: true } },
      dossier: { select: { reference: true, universite: { select: { nom: true } }, formation: { select: { intitule: true } } } },
    },
  });

  if (!paiement) {
    return NextResponse.json({ error: "Paiement non trouvé" }, { status: 404 });
  }

  const role = (session.user as { role?: string }).role;
  const userId = (session.user as { id: string }).id;
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

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Reçu ${paiement.reference}</title>
<style>
  body { font-family: 'General Sans', Inter, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; color: #1A1A1A; }
  .header { text-align: center; border-bottom: 2px solid #3CA936; padding-bottom: 20px; margin-bottom: 30px; }
  .header h1 { font-size: 24px; margin: 0; }
  .header p { color: #6B7280; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; }
  .recu { border: 1px solid #E5E7EB; border-radius: 8px; padding: 24px; }
  .recu h2 { font-size: 18px; margin: 0 0 16px; }
  .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #F3F4F6; }
  .row:last-child { border-bottom: none; }
  .label { color: #6B7280; font-size: 14px; }
  .value { font-weight: 600; font-size: 14px; }
  .mono { font-family: 'Geist Mono', monospace; }
  .total { margin-top: 16px; padding: 12px 16px; background: #E8F5E7; border-radius: 8px; display: flex; justify-content: space-between; }
  .total .value { font-size: 18px; color: #2E8329; }
  .footer { margin-top: 30px; text-align: center; color: #6B7280; font-size: 11px; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
  <div class="header">
    <p>GET Admission</p>
    <h1>Reçu de paiement</h1>
  </div>
  <div class="recu">
    <h2>Référence : <span class="mono">${paiement.reference}</span></h2>
    <div class="row"><span class="label">Date</span><span class="value">${formatDate(paiement.date.toISOString())}</span></div>
    <div class="row"><span class="label">Candidat</span><span class="value">${paiement.candidat.prenom} ${paiement.candidat.nom}</span></div>
    <div class="row"><span class="label">E-mail</span><span class="value">${paiement.candidat.email}</span></div>
    <div class="row"><span class="label">Dossier</span><span class="value mono">${paiement.dossier.reference}</span></div>
    <div class="row"><span class="label">Université</span><span class="value">${paiement.dossier.universite.nom}</span></div>
    <div class="row"><span class="label">Formation</span><span class="value">${paiement.dossier.formation.intitule}</span></div>
    <div class="row"><span class="label">Moyen de paiement</span><span class="value">${paiement.moyen}${paiement.tranche ? ` · ${paiement.tranche}` : ""}</span></div>
    <div class="row"><span class="label">Statut</span><span class="value" style="color: #3CA936;">${paiement.statut}</span></div>
    <div class="total"><span class="label">Montant</span><span class="value mono">${formatFCFA(paiement.montant)}</span></div>
  </div>
  <div class="footer">
    <p>GET Admission · Confidentiel</p>
    <p>Document généré électroniquement le ${formatDate(new Date().toISOString())}</p>
  </div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
