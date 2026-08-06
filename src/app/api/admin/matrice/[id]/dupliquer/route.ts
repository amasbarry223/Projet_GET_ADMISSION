import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/admin/matrice/[id]/dupliquer — copie une version en brouillon
export async function POST(_req: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const role = session.user.role;
  const userId = session.user.id;
  const gate = requirePermission(role, "matrice.write");
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { id } = await params;
  const source = await db.matriceVersion.findUnique({
    where: { id },
    include: { regles: { orderBy: { ordre: "asc" } } },
  });
  if (!source) return NextResponse.json({ error: "Version introuvable" }, { status: 404 });

  const last = await db.matriceVersion.findFirst({ orderBy: { numero: "desc" } });
  const nextNumero = (last?.numero ?? 0) + 1;

  const version = await db.matriceVersion.create({
    data: {
      numero: nextNumero,
      libelle: `${source.libelle} (copie)`,
      statut: "BROUILLON",
      notes: source.notes,
      createdById: userId,
      regles: {
        create: source.regles.map((r) => ({
          code: r.code,
          libelle: r.libelle,
          categorie: r.categorie,
          obligatoire: r.obligatoire,
          condition: r.condition,
          niveauMin: r.niveauMin,
          meta: r.meta,
          ordre: r.ordre,
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
    details: `Matrice v${version.numero} dupliquée depuis v${source.numero}`,
  });

  return NextResponse.json(version, { status: 201 });
}
