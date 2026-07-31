import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { mkdir, copyFile, unlink } from "fs/promises";
import path from "path";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { saveUpload } from "@/lib/storage";
import { logAudit } from "@/lib/audit";

const MEDIA_KINDS = ["cover", "logo", "gallery"] as const;
type MediaKind = (typeof MEDIA_KINDS)[number];

function parseGallery(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((u): u is string => typeof u === "string") : [];
  } catch {
    return [];
  }
}

async function publishToPublicUploads(cheminRelatif: string, univId: string): Promise<string> {
  const fileName = path.basename(cheminRelatif);
  const publicDir = path.join(process.cwd(), "public", "uploads", "partenaires", univId);
  await mkdir(publicDir, { recursive: true });
  const absUpload = path.join(process.cwd(), "upload", cheminRelatif);
  const publicPath = path.join(publicDir, fileName);
  await copyFile(absUpload, publicPath);
  return `/uploads/partenaires/${univId}/${fileName}`;
}

async function tryDeletePublicFile(url: string | null | undefined) {
  if (!url?.startsWith("/uploads/partenaires/")) return;
  try {
    await unlink(path.join(process.cwd(), "public", url.replace(/^\//, "")));
  } catch {
    // ignore missing file
  }
}

// POST /api/universites/[id]/media — upload cover | logo | gallery
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const gate = requirePermission((session.user as { role?: string }).role, "catalogue.write");
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;
  const existing = await db.universite.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    select: { id: true, nom: true, coverUrl: true, logoUrl: true, galleryUrls: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Université non trouvée" }, { status: 404 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const kindRaw = String(form.get("kind") ?? "");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
  }
  if (!MEDIA_KINDS.includes(kindRaw as MediaKind)) {
    return NextResponse.json({ error: "kind invalide (cover, logo, gallery)" }, { status: 400 });
  }
  const kind = kindRaw as MediaKind;

  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Le fichier doit être une image (JPG, PNG, WEBP)" },
      { status: 400 }
    );
  }

  let uploaded;
  try {
    uploaded = await saveUpload(file, `partenaires/${existing.id}`);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload échoué" },
      { status: 400 }
    );
  }

  let url: string;
  try {
    url = await publishToPublicUploads(uploaded.cheminRelatif, existing.id);
  } catch {
    return NextResponse.json({ error: "Publication du fichier échouée" }, { status: 500 });
  }

  let galleryUrls: string[] | undefined;

  if (kind === "cover") {
    await tryDeletePublicFile(existing.coverUrl);
    await db.universite.update({
      where: { id: existing.id },
      data: { coverUrl: url },
    });
  } else if (kind === "logo") {
    await tryDeletePublicFile(existing.logoUrl);
    await db.universite.update({
      where: { id: existing.id },
      data: { logoUrl: url },
    });
  } else {
    galleryUrls = [...parseGallery(existing.galleryUrls), url];
    await db.universite.update({
      where: { id: existing.id },
      data: { galleryUrls: JSON.stringify(galleryUrls) },
    });
  }

  await logAudit({
    session,
    action: "UPDATE",
    resource: "universite",
    resourceId: existing.id,
    details: `Média ${kind} uploadé : ${existing.nom}`,
  });

  return NextResponse.json({ success: true, url, kind, galleryUrls });
}

// DELETE /api/universites/[id]/media — retirer cover | logo | une image galerie
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const gate = requirePermission((session.user as { role?: string }).role, "catalogue.write");
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;
  const existing = await db.universite.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    select: { id: true, nom: true, coverUrl: true, logoUrl: true, galleryUrls: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Université non trouvée" }, { status: 404 });
  }

  let body: { kind?: string; url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const kindRaw = String(body.kind ?? "");
  if (!MEDIA_KINDS.includes(kindRaw as MediaKind)) {
    return NextResponse.json({ error: "kind invalide (cover, logo, gallery)" }, { status: 400 });
  }
  const kind = kindRaw as MediaKind;

  let galleryUrls: string[] | undefined;

  if (kind === "cover") {
    await tryDeletePublicFile(existing.coverUrl);
    await db.universite.update({
      where: { id: existing.id },
      data: { coverUrl: null },
    });
  } else if (kind === "logo") {
    await tryDeletePublicFile(existing.logoUrl);
    await db.universite.update({
      where: { id: existing.id },
      data: { logoUrl: null },
    });
  } else {
    if (!body.url) {
      return NextResponse.json({ error: "url requise pour retirer une image de galerie" }, { status: 400 });
    }
    const current = parseGallery(existing.galleryUrls);
    galleryUrls = current.filter((u) => u !== body.url);
    await tryDeletePublicFile(body.url);
    await db.universite.update({
      where: { id: existing.id },
      data: { galleryUrls: JSON.stringify(galleryUrls) },
    });
  }

  await logAudit({
    session,
    action: "UPDATE",
    resource: "universite",
    resourceId: existing.id,
    details: `Média ${kind} retiré : ${existing.nom}`,
  });

  return NextResponse.json({ success: true, kind, galleryUrls });
}
