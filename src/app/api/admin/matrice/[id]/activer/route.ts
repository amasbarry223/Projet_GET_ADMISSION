import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { invalidateMatriceCache } from "@/lib/dossier/matrice-loader";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/admin/matrice/[id]/activer
export async function POST(_req: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const gate = requirePermission(session.user.role, "matrice.write");
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { id } = await params;
  const version = await db.matriceVersion.findUnique({
    where: { id },
    include: { _count: { select: { regles: true } } },
  });
  if (!version) return NextResponse.json({ error: "Version introuvable" }, { status: 404 });
  if (version._count.regles === 0) {
    return NextResponse.json({ error: "Impossible d'activer une matrice sans règles" }, { status: 400 });
  }

  await db.$transaction(async (tx) => {
    await tx.matriceVersion.updateMany({
      where: { statut: "ACTIVE", NOT: { id } },
      data: { statut: "ARCHIVEE" },
    });
    await tx.matriceVersion.update({
      where: { id },
      data: { statut: "ACTIVE", activatedAt: new Date() },
    });
  });

  invalidateMatriceCache();

  await logAudit({
    session,
    action: "UPDATE",
    resource: "matrice",
    resourceId: id,
    details: `Matrice v${version.numero} activée`,
  });

  const result = await db.matriceVersion.findUnique({
    where: { id },
    include: { regles: { orderBy: { ordre: "asc" } }, _count: { select: { regles: true } } },
  });
  return NextResponse.json(result);
}
