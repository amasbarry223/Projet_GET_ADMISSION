import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { universiteSchema, validate } from "@/lib/validations";
import { parseJsonArray } from "@/lib/parse-json";
import { uniqueSlug } from "@/lib/utils";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/rbac";
import { resolveFraisAgence, resolveFraisRange, getFraisAgenceConfig } from "@/lib/dossier/frais-agence-server";

// GET /api/universites — liste publique (catalogue)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pays = searchParams.get("pays");
  const domaine = searchParams.get("domaine");
  const q = searchParams.get("q");

  const universites = await db.universite.findMany({
    where: {
      // Établissement technique de la procédure Université Publique — jamais choisi par le
      // candidat, ni géré comme un établissement du catalogue classique.
      estPlaceholder: false,
      AND: [
        pays && pays !== "tous" ? { pays } : {},
        domaine && domaine !== "tous" ? { domaines: { contains: domaine } } : {},
        q ? {
          OR: [
            { nom: { contains: q } },
            { ville: { contains: q } },
            { pays: { contains: q } },
          ]
        } : {},
      ],
    },
    include: { formations: true },
    orderBy: { nom: "asc" },
  });

  // Parse JSON string fields + frais dérivés du type (Parametre)
  const fraisConfig = await getFraisAgenceConfig();
  const result = universites.map((u) => {
    const frais = resolveFraisAgence(u.typeEtablissement, fraisConfig);
    return {
      ...u,
      fraisMin: frais,
      fraisMax: frais,
      domaines: parseJsonArray(u.domaines),
      pointsForts: parseJsonArray(u.pointsForts),
      galleryUrls: parseJsonArray(u.galleryUrls),
      formations: u.formations.map((f) => ({
        ...f,
        fraisAgence: frais,
      })),
    };
  });

  return NextResponse.json(result);
}

// POST /api/universites — créer une université (staff uniquement)
//
// Body: { nom, pays, drapeau, ville, ecusson, domaines[], description,
//         pointsForts[], imageCouleur, fraisMin, fraisMax, partenaire? }
// - Génère le slug depuis le nom (avec suffixe numérique si collision)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const gate = requirePermission(session.user.role, "catalogue.write");
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
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

  // Validation : fraisMax >= fraisMin
  if (fraisMax < fraisMin) {
    return NextResponse.json(
      { error: "fraisMax doit être supérieur ou égal à fraisMin" },
      { status: 400 }
    );
  }

  // Génère un slug unique
  const slug = await uniqueSlug(nom, async (s) => {
    const found = await db.universite.findUnique({ where: { slug: s }, select: { id: true } });
    return !!found;
  });

  const galleryStr = Array.isArray(galleryUrls)
    ? JSON.stringify(galleryUrls)
    : typeof galleryUrls === "string"
      ? galleryUrls
      : "[]";

  const type = typeEtablissement ?? "PRIVE";
  const fraisConfig = await getFraisAgenceConfig();
  const range = resolveFraisRange(type, fraisConfig);

  const created = await db.universite.create({
    data: {
      slug,
      nom: nom.trim(),
      pays: pays.trim(),
      drapeau,
      ville: ville.trim(),
      ecusson,
      domaines: JSON.stringify(domaines),
      description,
      pointsForts: JSON.stringify(pointsForts),
      imageCouleur,
      siteUrl: siteUrl || null,
      logoUrl: logoUrl || null,
      coverUrl: coverUrl || null,
      galleryUrls: galleryStr,
      typeEtablissement: type,
      fraisMin: range.fraisMin,
      fraisMax: range.fraisMax,
      partenaire: partenaire ?? true,
    },
  });

  await logAudit({
    session,
    action: "CREATE",
    resource: "universite",
    resourceId: created.id,
    details: `Université créée : ${created.nom}`,
  });

  // Recharger avec formations pour cohérence avec GET
  const result = {
    ...created,
    domaines: parseJsonArray(created.domaines),
    pointsForts: parseJsonArray(created.pointsForts),
  };

  return NextResponse.json(result, { status: 201 });
}
