import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { parseOrRespond } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { saveUpload, deletePublicMedia } from "@/lib/storage";
import { logAudit } from "@/lib/audit";
import { parseJsonArray } from "@/lib/parse-json";
import { universiteMediaDeleteSchema, universiteMediaUploadSchema } from "@/lib/validations";

// POST /api/universites/[id]/media — upload cover | logo | gallery
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const gate = requirePermission(session.user.role, "catalogue.write");
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
  const kindParsed = parseOrRespond(universiteMediaUploadSchema, {
    kind: form.get("kind") ? String(form.get("kind")) : undefined,
  });
  if (!kindParsed.ok) return kindParsed.response;
  const { kind } = kindParsed.data;

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Le fichier doit être une image (JPG, PNG, WEBP)" },
      { status: 400 }
    );
  }

  let uploaded;
  try {
    uploaded = await saveUpload(file, `partenaires/${existing.id}`, { visibility: "public" });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload échoué" },
      { status: 400 }
    );
  }

  const url = uploaded.publicUrl;
  if (!url) {
    return NextResponse.json({ error: "Publication du fichier échouée" }, { status: 500 });
  }

  let galleryUrls: string[] | undefined;

  if (kind === "cover") {
    await deletePublicMedia(existing.coverUrl);
    await db.universite.update({
      where: { id: existing.id },
      data: { coverUrl: url },
    });
  } else if (kind === "logo") {
    await deletePublicMedia(existing.logoUrl);
    await db.universite.update({
      where: { id: existing.id },
      data: { logoUrl: url },
    });
  } else {
    galleryUrls = [...parseJsonArray(existing.galleryUrls), url];
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
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const gate = requirePermission(session.user.role, "catalogue.write");
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

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const parsed = parseOrRespond(universiteMediaDeleteSchema, raw);
  if (!parsed.ok) return parsed.response;
  const { kind, url } = parsed.data;

  let galleryUrls: string[] | undefined;

  if (kind === "cover") {
    await deletePublicMedia(existing.coverUrl);
    await db.universite.update({
      where: { id: existing.id },
      data: { coverUrl: null },
    });
  } else if (kind === "logo") {
    await deletePublicMedia(existing.logoUrl);
    await db.universite.update({
      where: { id: existing.id },
      data: { logoUrl: null },
    });
  } else {
    const current = parseJsonArray(existing.galleryUrls);
    galleryUrls = current.filter((u) => u !== url);
    await deletePublicMedia(url);
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
