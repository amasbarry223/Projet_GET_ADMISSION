import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";

// GET /api/attestation-pdf/[dossierId] — Attestation HTML imprimable
export async function GET(
  request: Request,
  { params }: { params: Promise<{ dossierId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { dossierId } = await params;
  const attestation = await db.attestation.findUnique({
    where: { dossierId },
    include: {
      dossier: {
        include: {
          candidat: { select: { prenom: true, nom: true } },
          universite: { select: { nom: true, ville: true, pays: true } },
          formation: { select: { intitule: true, niveau: true } },
          emetteur: { select: { prenom: true, nom: true } },
        },
      },
    },
  });

  if (!attestation) {
    return NextResponse.json({ error: "Attestation non trouvée" }, { status: 404 });
  }

  // RBAC: candidat ne voit que son attestation
  const role = (session.user as any).role;
  const userId = (session.user as any).id;
  if (role === "CANDIDAT" && attestation.dossier.candidatId !== userId) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const d = attestation.dossier;
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Attestation ${attestation.reference}</title>
<style>
  body { font-family: 'General Sans', Inter, sans-serif; max-width: 700px; margin: 40px auto; padding: 20px; color: #0E1B33; }
  .header { text-align: center; border-bottom: 2px solid #B8902E; padding-bottom: 20px; margin-bottom: 30px; }
  .header h1 { font-size: 28px; margin: 0; }
  .header p { color: #5A6781; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; }
  .ref { display: flex; justify-content: space-between; margin-bottom: 30px; }
  .ref .mono { font-family: 'Geist Mono', monospace; font-size: 13px; }
  .body { line-height: 1.8; font-size: 15px; }
  .body strong { color: #173A7A; }
  .seal { margin: 40px auto; width: 120px; height: 120px; border: 3px solid #B8902E; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; transform: rotate(-8deg); }
  .seal-inner { width: 90px; height: 90px; border: 2px solid #B8902E; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .seal p { font-family: 'Geist Mono', monospace; font-size: 8px; font-weight: 700; color: #B8902E; text-transform: uppercase; letter-spacing: 1px; margin: 2px; }
  .sign { margin-top: 40px; display: flex; justify-content: space-between; }
  .sign-block { text-align: center; }
  .sign-block .line { border-top: 1px solid #5A6781; width: 200px; margin-top: 40px; padding-top: 8px; }
  .sign-block .name { font-weight: 700; }
  .sign-block .role { color: #5A6781; font-size: 13px; }
  .footer { margin-top: 40px; text-align: center; color: #5A6781; font-size: 11px; border-top: 1px solid #E2E7F0; padding-top: 16px; }
  .mono { font-family: 'Geist Mono', monospace; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
  <div class="header">
    <p>GET Admission</p>
    <h1>Attestation de pré-inscription</h1>
  </div>
  <div class="ref">
    <div><span style="color:#5A6781;font-size:12px;text-transform:uppercase;letter-spacing:2px;">Référence</span><br><span class="mono">${attestation.reference}</span></div>
    <div style="text-align:right;"><span style="color:#5A6781;font-size:12px;text-transform:uppercase;letter-spacing:2px;">Année</span><br><span class="mono">2026-2027</span></div>
  </div>
  <div class="body">
    <p>Je soussignée <strong>${d.emetteur.prenom} ${d.emetteur.nom}</strong>, Directrice de GET Admission, atteste que</p>
    <p style="font-size: 22px; font-weight: 700; color: #173A7A; text-align: center; margin: 20px 0;">${d.candidat.prenom} ${d.candidat.nom}</p>
    <p>a constitué un dossier complet et conforme, et a été admis(e) en pré-inscription pour le cursus</p>
    <p style="font-size: 18px; font-weight: 700; text-align: center; margin: 16px 0;">${d.formation.intitule}</p>
    <p>à l'<strong>${d.universite.nom}</strong> (${d.universite.ville}, ${d.universite.pays}), pour l'année universitaire 2026-2027.</p>
    <div style="background:#F3ECD8;border-radius:8px;padding:16px;margin:24px 0;">
      <div style="display:flex;justify-content:space-between;font-size:13px;">
        <span style="color:#5A6781;">Code de vérification</span>
        <span class="mono" style="font-weight:700;color:#B8902E;">${attestation.codeVerification}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-top:8px;">
        <span style="color:#5A6781;">Date d'émission</span>
        <span class="mono">${formatDate(attestation.dateEmission.toISOString())}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-top:8px;">
        <span style="color:#5A6781;">Mode de remise</span>
        <span>${attestation.modeRemise === "agence" ? "Retrait à l'agence" : "Téléchargement"}</span>
      </div>
    </div>
  </div>
  <div class="seal">
    <div class="seal-inner">
      <p>GET Admission</p>
      <p>Sceau officiel</p>
    </div>
  </div>
  <div class="sign">
    <div class="sign-block">
      <div class="line"></div>
      <p class="name">${d.emetteur.prenom} ${d.emetteur.nom}</p>
      <p class="role">Directrice · GET Admission</p>
    </div>
  </div>
  <div class="footer">
    <p class="mono">GETADM · ${d.reference} · Attestation générée électroniquement</p>
    <p>Vérifiez l'authenticité sur getadm.com/verifier avec le code : ${attestation.codeVerification}</p>
  </div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
