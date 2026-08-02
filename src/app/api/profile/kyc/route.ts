import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { saveUpload, deleteUpload, resolveUploadPath } from "@/lib/storage";
import { hasPermission } from "@/lib/rbac";
import { readFile } from "fs/promises";
import path from "path";
import { logAudit } from "@/lib/audit";

// POST /api/profile/kyc — upload recto/verso KYC (multipart)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const form = await request.formData();
  const side = String(form.get("side") || "recto"); // recto | verso
  const file = form.get("file");
  const kycType = form.get("kycType") ? String(form.get("kycType")) : undefined;
  const kycNumero = form.get("kycNumero") ? String(form.get("kycNumero")) : undefined;

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
  }
  if (side !== "recto" && side !== "verso") {
    return NextResponse.json({ error: "side doit être recto ou verso" }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  let uploaded;
  try {
    uploaded = await saveUpload(file, `kyc/${userId}`);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload échoué" },
      { status: 400 }
    );
  }

  const oldPath = side === "recto" ? user.kycRectoPath : user.kycVersoPath;
  if (oldPath) await deleteUpload(oldPath);

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

  return NextResponse.json({ success: true, user: updated, uploaded: { side, ...uploaded } });
}

// PUT /api/profile/kyc — staff valide le KYC d'un candidat { userId, verifie: true|false }
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role;
  if (!hasPermission(role, "dossiers.write")) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await request.json();
  const userId = String(body.userId || "");
  const verifie = Boolean(body.verifie);

  if (!userId) {
    return NextResponse.json({ error: "userId requis" }, { status: 400 });
  }

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
  const targetId = searchParams.get("userId") || (session.user as { id: string }).id;
  const role = (session.user as { role?: string }).role;
  const selfId = (session.user as { id: string }).id;

  if (targetId !== selfId && !hasPermission(role, "dossiers.write") && !hasPermission(role, "dossiers.read")) {
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
    const abs = resolveUploadPath(chemin);
    const buffer = await readFile(abs);
    const ext = path.extname(chemin).toLowerCase();
    const mime =
      ext === ".pdf" ? "application/pdf" : ext === ".png" ? "image/png" : "image/jpeg";
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `inline; filename="kyc-${side}${ext}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Fichier inaccessible" }, { status: 404 });
  }
}
