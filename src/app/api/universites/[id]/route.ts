import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { universiteSchema, validate } from "@/lib/validations";
import { uniqueSlug } from "@/lib/utils";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/rbac";
import { resolveFraisAgence, resolveFraisRange } from "@/lib/dossier/frais-agence";

// GET /api/universites/[id] — détail par ID (staff) — alias de la route /by-slug
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Accepte soit un ID cuid, soit un slug
  const universite = await db.universite.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: { formations: true },
  });

  if (!universite) {
    return NextResponse.json({ error: "Université non trouvée" }, { status: 404 });
  }

  const result = {
    ...universite,
    domaines: JSON.parse(universite.domaines),
    pointsForts: JSON.parse(universite.pointsForts),
    fraisMin: resolveFraisAgence(universite.typeEtablissement),
    fraisMax: resolveFraisAgence(universite.typeEtablissement),
    formations: universite.formations.map((f) => ({
      ...f,
      fraisAgence: resolveFraisAgence(universite.typeEtablissement),
      prerequis: JSON.parse(f.prerequis),
      piecesRequises: JSON.parse(f.piecesRequises),
    })),
  };

  return NextResponse.json(result);
}

// PUT /api/universites/[id] — mettre à jour une université (staff uniquement)
export async function PUT(
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
    select: { id: true, slug: true, nom: true, typeEtablissement: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Université non trouvée" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = validate(universiteSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const {
    nom, pays, drapeau, ville, ecusson, domaines,
    description, pointsForts, imageCouleur, fraisMin, fraisMax, partenaire,
    siteUrl, logoUrl, coverUrl, galleryUrls, typeEtablissement,
  } = parsed.data;

  if (fraisMax < fraisMin) {
    return NextResponse.json(
      { error: "fraisMax doit être supérieur ou égal à fraisMin" },
      { status: 400 }
    );
  }

  // Si le nom change, on régénère le slug (unique)
  let newSlug = existing.slug;
  if (nom.trim() !== existing.nom) {
    newSlug = await uniqueSlug(nom, async (s) => {
      const found = await db.universite.findFirst({
        where: { slug: s, NOT: { id: existing.id } },
        select: { id: true },
      });
      return !!found;
    });
  }

  const galleryStr = Array.isArray(galleryUrls)
    ? JSON.stringify(galleryUrls)
    : typeof galleryUrls === "string"
      ? galleryUrls
      : undefined;

  const type = typeEtablissement ?? existing.typeEtablissement ?? "PRIVE";
  const range = resolveFraisRange(type);
  const fraisFormation = resolveFraisAgence(type);

  const updated = await db.$transaction(async (tx) => {
    const univ = await tx.universite.update({
      where: { id: existing.id },
      data: {
        slug: newSlug,
        nom: nom.trim(),
        pays: pays.trim(),
        drapeau,
        ville: ville.trim(),
        ecusson,
        domaines: JSON.stringify(domaines),
        description,
        pointsForts: JSON.stringify(pointsForts),
        imageCouleur,
        fraisMin: range.fraisMin,
        fraisMax: range.fraisMax,
        typeEtablissement: type,
        ...(partenaire !== undefined ? { partenaire } : {}),
        ...(siteUrl !== undefined ? { siteUrl: siteUrl || null } : {}),
        ...(logoUrl !== undefined ? { logoUrl: logoUrl || null } : {}),
        ...(coverUrl !== undefined ? { coverUrl: coverUrl || null } : {}),
        ...(galleryStr !== undefined ? { galleryUrls: galleryStr } : {}),
      },
    });

    await tx.formation.updateMany({
      where: { universiteId: existing.id },
      data: { fraisAgence: fraisFormation },
    });

    // Aligner les dossiers encore éditables
    await tx.dossier.updateMany({
      where: {
        universiteId: existing.id,
        etat: { in: ["BROUILLON", "CORRECTION"] },
      },
      data: { fraisAgence: fraisFormation },
    });

    return univ;
  });

  await logAudit({
    session,
    action: "UPDATE",
    resource: "universite",
    resourceId: updated.id,
    details: `Université mise à jour : ${updated.nom}`,
  });

  const result = {
    ...updated,
    domaines: JSON.parse(updated.domaines),
    pointsForts: JSON.parse(updated.pointsForts),
  };

  return NextResponse.json(result);
}

// DELETE /api/universites/[id] — supprimer une université
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
    select: { id: true, nom: true, _count: { select: { dossiers: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Université non trouvée" }, { status: 404 });
  }

  if (existing._count.dossiers > 0) {
    return NextResponse.json(
      {
        error: `Impossible de supprimer : ${existing._count.dossiers} dossier(s) sont liés à cette université. Archivez-la plutôt.`,
      },
      { status: 409 }
    );
  }

  // Cascade va supprimer les formations liées
  await db.universite.delete({ where: { id: existing.id } });

  await logAudit({
    session,
    action: "DELETE",
    resource: "universite",
    resourceId: existing.id,
    details: `Université supprimée : ${existing.nom}`,
  });

  return NextResponse.json({ success: true, id: existing.id });
}
