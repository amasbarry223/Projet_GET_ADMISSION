import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { invalidateMatriceCache } from "@/lib/dossier/matrice-loader";
import { MATRICE_V1_REGLES } from "@/lib/dossier/matrice-v1-regles";

// GET /api/admin/matrice — liste des versions
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role;
  const gate = requirePermission(role, "matrice.write");
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const versions = await db.matriceVersion.findMany({
    orderBy: { numero: "desc" },
    include: { _count: { select: { regles: true } } },
  });
  return NextResponse.json(versions);
}

// POST /api/admin/matrice — créer un brouillon (copie de l'ACTIVE ou seed v1)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role;
  const userId = (session.user as { id: string }).id;
  const gate = requirePermission(role, "matrice.write");
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  let body: { libelle?: string; notes?: string; fromActive?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

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
    session,
    action: "CREATE",
    resource: "matrice",
    resourceId: version.id,
    details: `Brouillon matrice v${version.numero} créé`,
  });

  return NextResponse.json(version, { status: 201 });
}
