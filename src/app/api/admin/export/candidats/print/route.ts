import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { formatDate } from "@/lib/format";
import { escapeHtml } from "@/lib/escape-html";

// GET /api/admin/export/candidats/print — vue imprimable de la liste des candidats
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const gate = requirePermission(session.user.role, "candidats.read");
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const candidats = await db.user.findMany({
    where: { role: "CANDIDAT" },
    select: {
      prenom: true,
      nom: true,
      email: true,
      telephone: true,
      nationalite: true,
      actif: true,
      kycVerifie: true,
      createdAt: true,
      _count: { select: { dossiersCandidat: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const e = escapeHtml;
  const rows = candidats
    .map(
      (c) => `<tr>
        <td>${e(c.prenom)} ${e(c.nom)}</td>
        <td>${e(c.email)}</td>
        <td>${e(c.telephone ?? "—")}</td>
        <td>${e(c.nationalite ?? "—")}</td>
        <td>${c.actif ? "Actif" : "Désactivé"}</td>
        <td>${c.kycVerifie ? "Vérifié" : "En attente"}</td>
        <td>${c._count.dossiersCandidat}</td>
        <td>${e(formatDate(c.createdAt.toISOString()))}</td>
      </tr>`,
    )
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Candidats — GET Admission</title>
<style>
  body { font-family: 'General Sans', Inter, sans-serif; margin: 32px; color: #1A1A1A; }
  .header { text-align: center; border-bottom: 2px solid #3CA936; padding-bottom: 16px; margin-bottom: 20px; }
  .header img { height: 36px; }
  .header h1 { font-size: 20px; margin: 10px 0 0; }
  .header p { color: #6B7280; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #E5E7EB; padding: 6px 8px; text-align: left; }
  th { background: #F3F4F6; font-size: 10px; text-transform: uppercase; color: #6B7280; }
  .footer { margin-top: 20px; text-align: center; color: #6B7280; font-size: 10px; }
  @media print { body { margin: 0.5cm; } }
</style>
</head>
<body>
  <div class="header">
    <img src="/images/brand/logo-get-admission.png" alt="GET Admission" />
    <h1>Candidats inscrits</h1>
    <p>${candidats.length} candidat(s)</p>
  </div>
  <table>
    <thead>
      <tr><th>Nom</th><th>E-mail</th><th>Téléphone</th><th>Nationalité</th><th>Statut</th><th>KYC</th><th>Dossiers</th><th>Inscrit le</th></tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <div class="footer">
    Généré par ${e(`${session.user.prenom} ${session.user.nom}`)} le ${e(formatDate(new Date().toISOString()))}
  </div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
