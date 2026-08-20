import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { parseOrRespond } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { kycUploadFieldsSchema, kycVerifySchema, kycDeleteSchema } from "@/lib/validations";
import { saveUpload, deleteUpload, readUpload } from "@/lib/storage";
import { hasPermission } from "@/lib/rbac";
import path from "path";
import { logAudit } from "@/lib/audit";

/**
 * Cette route est ouverte en navigation directe (target="_blank") depuis l'admin — une
 * réponse JSON brute y est illisible. Si le navigateur demande du HTML, on rend une page
 * d'état plutôt que le JSON, réservé aux appels programmatiques (fetch/apiJson).
 */
function wantsHtml(request: Request): boolean {
  return (request.headers.get("accept") ?? "").includes("text/html");
}

function kycStatusPage(opts: { title: string; message: string; status: number }) {
  return new NextResponse(
    `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${opts.title} — GET Admission</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #F3F4F6;
    font-family: "General Sans", "Inter", system-ui, sans-serif;
    color: #1A1A1A;
    padding: 24px;
  }
  .card {
    max-width: 420px;
    width: 100%;
    background: #FFFFFF;
    border: 1px solid #E5E7EB;
    border-radius: 16px;
    padding: 36px 32px;
    text-align: center;
    box-shadow: 0 12px 40px rgba(26,26,26,.10);
  }
  .icon {
    width: 48px;
    height: 48px;
    margin: 0 auto 20px;
    border-radius: 12px;
    background: rgba(199,122,18,.12);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  h1 {
    font-size: 17px;
    font-weight: 700;
    margin: 0 0 8px;
    letter-spacing: -0.01em;
  }
  p {
    font-size: 14px;
    line-height: 1.5;
    color: #6B7280;
    margin: 0;
  }
  .eyebrow {
    font-family: "Geist Mono", monospace;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: #3CA936;
    margin: 0 0 14px;
  }
</style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C77A12" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2.5"/>
        <circle cx="8.5" cy="11.5" r="1.75"/>
        <path d="M5 16c.7-1.8 2-2.6 3.5-2.6s2.8.8 3.5 2.6"/>
        <line x1="14.5" y1="9.5" x2="19" y2="9.5"/>
        <line x1="14.5" y1="13" x2="19" y2="13"/>
      </svg>
    </div>
    <p class="eyebrow">GET Admission · KYC</p>
    <h1>${opts.title}</h1>
    <p>${opts.message}</p>
  </div>
</body>
</html>`,
    { status: opts.status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

// POST /api/profile/kyc — upload recto/verso KYC (multipart)
export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const selfId = session.user.id;
  const form = await request.formData();
  const file = form.get("file");
  const fieldsParsed = parseOrRespond(kycUploadFieldsSchema, {
    side: form.get("side") ? String(form.get("side")) : undefined,
    kycType: form.get("kycType") ? String(form.get("kycType")) : undefined,
    kycNumero: form.get("kycNumero") ? String(form.get("kycNumero")) : undefined,
    targetUserId: form.get("targetUserId") ? String(form.get("targetUserId")) : undefined,
  });
  if (!fieldsParsed.ok) return fieldsParsed.response;
  const { side, kycType, kycNumero, targetUserId } = fieldsParsed.data;

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
  }

  // Upload pour un candidat par un membre du staff (kyc.write) — sinon upload pour soi-même
  let userId = selfId;
  if (targetUserId && targetUserId !== selfId) {
    if (!hasPermission(session.user.role, "kyc.write")) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
    userId = targetUserId;
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }
  if (userId !== selfId && user.role !== "CANDIDAT") {
    return NextResponse.json(
      { error: "Le téléversement KYC ne s'applique qu'aux candidats" },
      { status: 400 },
    );
  }

  let uploaded;
  try {
    uploaded = await saveUpload(file, `kyc/${userId}`, { visibility: "private" });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload échoué" },
      { status: 400 }
    );
  }

  const oldPath = side === "recto" ? user.kycRectoPath : user.kycVersoPath;
  if (oldPath) await deleteUpload(oldPath, "private");

  const updated = await db.user.update({
    where: { id: userId },
    data: {
      ...(side === "recto" ? { kycRectoPath: uploaded.cheminRelatif } : { kycVersoPath: uploaded.cheminRelatif }),
      ...(kycType ? { kycType } : user.kycType ? {} : { kycType: "passeport" }),
      ...(kycNumero ? { kycNumero } : {}),
      ...((kycType || user.kycType || "passeport") === "passeport" ? { kycVersoPath: null } : {}),
      kycVerifie: false,
      kycVerifieLe: null,
    },
    select: {
      id: true,
      kycType: true,
      kycNumero: true,
      kycRectoPath: true,
      kycVersoPath: true,
      kycVerifie: true,
      kycVerifieLe: true,
    },
  });

  if (userId !== selfId) {
    await logAudit({
      session,
      action: "UPDATE",
      resource: "user",
      resourceId: userId,
      details: `Pièce KYC (${side}) téléversée par le staff pour ${user.prenom} ${user.nom}`,
    });
  }

  return NextResponse.json({ success: true, user: updated, uploaded: { side, ...uploaded } });
}

// PUT /api/profile/kyc — staff valide le KYC d'un candidat { userId, verifie: true|false }
export async function PUT(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const role = session.user.role;
  if (!hasPermission(role, "kyc.write")) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const parsed = parseOrRespond(kycVerifySchema, body);
  if (!parsed.ok) return parsed.response;
  const { userId, verifie } = parsed.data;

  const target = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      prenom: true,
      nom: true,
      role: true,
      kycType: true,
      kycRectoPath: true,
      kycVersoPath: true,
    },
  });
  if (!target) {
    return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
  }
  if (target.role !== "CANDIDAT") {
    return NextResponse.json(
      { error: "La validation KYC ne s'applique qu'aux candidats" },
      { status: 400 }
    );
  }
  if (verifie && !target.kycRectoPath) {
    return NextResponse.json(
      {
        error: "Impossible de valider le KYC sans la pièce d'identité (recto) téléversée.",
      },
      { status: 400 }
    );
  }

  const assignedDossier = await db.dossier.findFirst({
    where: { candidatId: userId, conseillerId: { not: null } },
    include: { conseiller: { select: { id: true, prenom: true, nom: true } } },
  });
  if (assignedDossier?.conseillerId && session.user.id !== assignedDossier.conseillerId) {
    const nom = assignedDossier.conseiller
      ? `${assignedDossier.conseiller.prenom} ${assignedDossier.conseiller.nom}`
      : "un conseiller";
    return NextResponse.json(
      {
        error: `Validation KYC restreinte : ce candidat est affecté au conseiller ${nom}. Seul ce conseiller a l'autorisation de valider sa pièce KYC.`,
      },
      { status: 403 },
    );
  }

  const updated = await db.user.update({
    where: { id: userId },
    data: {
      kycVerifie: verifie,
      kycVerifieLe: verifie ? new Date() : null,
    },
    select: {
      id: true,
      prenom: true,
      nom: true,
      kycVerifie: true,
      kycVerifieLe: true,
    },
  });

  await logAudit({
    session,
    action: "UPDATE",
    resource: "user",
    resourceId: userId,
    details: `KYC ${verifie ? "vérifié" : "invalidé"} pour ${updated.prenom} ${updated.nom}`,
  });

  return NextResponse.json({ success: true, user: updated });
}

// GET /api/profile/kyc?side=recto|verso&userId=optional — download
export async function GET(request: Request) {
  const html = wantsHtml(request);

  const session = await getSession();
  if (!session?.user) {
    if (html) {
      return kycStatusPage({
        status: 401,
        title: "Session expirée",
        message: "Reconnectez-vous pour consulter cette pièce d'identité.",
      });
    }
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const side = searchParams.get("side") || "recto";
  const targetId = searchParams.get("userId") || session.user.id;
  const role = session.user.role;
  const selfId = session.user.id;

  if (targetId !== selfId) {
    if (!hasPermission(role, "kyc.read")) {
      if (html) {
        return kycStatusPage({
          status: 403,
          title: "Accès refusé",
          message: "Vous n'avez pas les droits nécessaires pour consulter cette pièce d'identité.",
        });
      }
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const assignedDossier = await db.dossier.findFirst({
      where: { candidatId: targetId, conseillerId: { not: null } },
      include: { conseiller: { select: { id: true, prenom: true, nom: true } } },
    });
    if (assignedDossier?.conseillerId && selfId !== assignedDossier.conseillerId) {
      const nom = assignedDossier.conseiller
        ? `${assignedDossier.conseiller.prenom} ${assignedDossier.conseiller.nom}`
        : "un conseiller";
      if (html) {
        return kycStatusPage({
          status: 403,
          title: "Consultation KYC restreinte",
          message: `Ce candidat est affecté au conseiller ${nom}. Seul le conseiller affecté a la capacité de consulter sa pièce KYC.`,
        });
      }
      return NextResponse.json(
        { error: `Accès refusé — Ce candidat est affecté au conseiller ${nom}. Seul ce conseiller peut consulter sa pièce KYC.` },
        { status: 403 },
      );
    }
  }

  const user = await db.user.findUnique({ where: { id: targetId } });
  if (!user) {
    if (html) {
      return kycStatusPage({ status: 404, title: "Candidat introuvable", message: "Ce compte n'existe plus." });
    }
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  const chemin = side === "verso" ? user.kycVersoPath : user.kycRectoPath;
  if (!chemin) {
    if (html) {
      return kycStatusPage({
        status: 404,
        title: "Aucune pièce téléversée",
        message: `${user.prenom} ${user.nom} n'a pas encore transmis de ${side === "verso" ? "verso" : "recto"} de pièce d'identité.`,
      });
    }
    return NextResponse.json({ error: "Fichier KYC absent" }, { status: 404 });
  }

  try {
    const { buffer, contentType, fileName } = await readUpload(chemin, "private");
    const ext = path.extname(fileName).toLowerCase() || path.extname(chemin).toLowerCase();
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="kyc-${side}${ext || ".bin"}"`,
      },
    });
  } catch {
    if (html) {
      return kycStatusPage({
        status: 404,
        title: "Fichier inaccessible",
        message: "Le document n'a pas pu être chargé depuis le stockage. Réessayez ou contactez le support technique.",
      });
    }
    return NextResponse.json({ error: "Fichier inaccessible" }, { status: 404 });
  }
}

// DELETE /api/profile/kyc — supprime le(s) document(s) KYC d'un candidat (staff, kyc.write uniquement)
export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!hasPermission(session.user.role, "kyc.write")) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const parsed = parseOrRespond(kycDeleteSchema, body);
  if (!parsed.ok) return parsed.response;
  const { userId, side } = parsed.data;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, prenom: true, nom: true, role: true, kycRectoPath: true, kycVersoPath: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }
  if (user.role !== "CANDIDAT") {
    return NextResponse.json(
      { error: "La suppression KYC ne s'applique qu'aux candidats" },
      { status: 400 },
    );
  }

  if ((side === "recto" || side === "both") && user.kycRectoPath) {
    await deleteUpload(user.kycRectoPath, "private");
  }
  if ((side === "verso" || side === "both") && user.kycVersoPath) {
    await deleteUpload(user.kycVersoPath, "private");
  }

  const updated = await db.user.update({
    where: { id: userId },
    data: {
      ...(side === "recto" || side === "both" ? { kycRectoPath: null } : {}),
      ...(side === "verso" || side === "both" ? { kycVersoPath: null } : {}),
      kycVerifie: false,
      kycVerifieLe: null,
    },
    select: {
      id: true,
      kycType: true,
      kycNumero: true,
      kycRectoPath: true,
      kycVersoPath: true,
      kycVerifie: true,
      kycVerifieLe: true,
    },
  });

  await logAudit({
    session,
    action: "DELETE",
    resource: "user",
    resourceId: userId,
    details: `Pièce KYC (${side}) supprimée par le staff pour ${user.prenom} ${user.nom}`,
  });

  return NextResponse.json({ success: true, user: updated });
}
