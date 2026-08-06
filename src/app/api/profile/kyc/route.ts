import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { parseOrRespond } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { kycUploadFieldsSchema, kycVerifySchema, kycDeleteSchema } from "@/lib/validations";
import { saveUpload, deleteUpload, readUpload } from "@/lib/storage";
import { hasPermission } from "@/lib/rbac";
import path from "path";
import { logAudit } from "@/lib/audit";

// POST /api/profile/kyc — upload recto/verso KYC (multipart)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
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
      ...(kycType ? { kycType } : {}),
      ...(kycNumero ? { kycNumero } : {}),
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
  const session = await getServerSession(authOptions);
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
  if (verifie && (!target.kycRectoPath || !target.kycVersoPath)) {
    return NextResponse.json(
      { error: "Impossible de valider le KYC sans recto et verso téléversés" },
      { status: 400 }
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
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const side = searchParams.get("side") || "recto";
  const targetId = searchParams.get("userId") || session.user.id;
  const role = session.user.role;
  const selfId = session.user.id;

  if (targetId !== selfId && !hasPermission(role, "kyc.read")) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const user = await db.user.findUnique({ where: { id: targetId } });
  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  const chemin = side === "verso" ? user.kycVersoPath : user.kycRectoPath;
  if (!chemin) {
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
    return NextResponse.json({ error: "Fichier inaccessible" }, { status: 404 });
  }
}

// DELETE /api/profile/kyc — supprime le(s) document(s) KYC d'un candidat (staff, kyc.write uniquement)
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
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
