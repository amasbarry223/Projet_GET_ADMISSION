import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseOrRespond, requireApiPermission } from "@/lib/api-auth";
import { matriceDraftCreateSchema } from "@/lib/validations";
import { logAudit } from "@/lib/audit";
import { MATRICE_V1_REGLES } from "@/lib/dossier/matrice-v1-regles";

// GET /api/admin/matrice — liste des versions
export async function GET() {
  const auth = await requireApiPermission("matrice.write");
  if (!auth.ok) return auth.response;

  const versions = await db.matriceVersion.findMany({
    orderBy: { numero: "desc" },
    include: { _count: { select: { regles: true } } },
  });
  return NextResponse.json(versions);
}

// POST /api/admin/matrice — créer un brouillon (copie de l'ACTIVE ou seed v1)
export async function POST(request: Request) {
  const auth = await requireApiPermission("matrice.write");
  if (!auth.ok) return auth.response;
  const userId = auth.user.id;

  let raw: unknown = {};
  try {
    raw = await request.json();
  } catch {
    raw = {};
  }
  const parsed = parseOrRespond(matriceDraftCreateSchema, raw);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const last = await db.matriceVersion.findFirst({ orderBy: { numero: "desc" } });
  const nextNumero = (last?.numero ?? 0) + 1;

  const source = body.fromActive !== false
    ? await db.matriceVersion.findFirst({
        where: { statut: "ACTIVE" },
        include: { regles: true },
      })
    : null;

  const version = await db.matriceVersion.create({
    data: {
      numero: nextNumero,
      libelle: body.libelle || `Matrice v${nextNumero}`,
      statut: "BROUILLON",
      notes: body.notes || "",
      createdById: userId,
      regles: {
        create: (source?.regles ?? MATRICE_V1_REGLES).map((r, i) => ({
          code: r.code,
          libelle: r.libelle,
          categorie: r.categorie,
          obligatoire: r.obligatoire,
          condition: r.condition as never,
          niveauMin: "niveauMin" in r ? (r.niveauMin ?? null) : null,
          meta: "meta" in r && r.meta ? r.meta : "{}",
          ordre: "ordre" in r ? r.ordre : i * 10,
        })),
      },
    },
    include: { regles: { orderBy: { ordre: "asc" } }, _count: { select: { regles: true } } },
  });

  await logAudit({
    session: auth.session,
    action: "CREATE",
    resource: "matrice",
    resourceId: version.id,
    details: `Brouillon matrice v${version.numero} créé`,
  });

  return NextResponse.json(version, { status: 201 });
}
