import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { invalidateMatriceCache } from "@/lib/dossier/matrice-loader";
import { z } from "zod";
import { validate } from "@/lib/validations";

const regleSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1).max(80),
  libelle: z.string().min(1).max(200),
  categorie: z.string().min(1).max(40),
  obligatoire: z.boolean(),
  condition: z.string().min(1),
  niveauMin: z.string().nullable().optional(),
  meta: z.string().optional(),
  ordre: z.number().int(),
});

const updateSchema = z.object({
  libelle: z.string().min(1).max(120).optional(),
  notes: z.string().max(2000).optional(),
  regles: z.array(regleSchema).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const gate = requirePermission((session.user as { role?: string }).role, "matrice.write");
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { id } = await params;
  const version = await db.matriceVersion.findUnique({
    where: { id },
    include: { regles: { orderBy: { ordre: "asc" } } },
  });
  if (!version) return NextResponse.json({ error: "Version introuvable" }, { status: 404 });
  return NextResponse.json(version);
}

export async function PUT(request: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const gate = requirePermission((session.user as { role?: string }).role, "matrice.write");
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { id } = await params;
  const existing = await db.matriceVersion.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Version introuvable" }, { status: 404 });
  if (existing.statut === "ARCHIVEE") {
    return NextResponse.json({ error: "Version archivée non modifiable" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const parsed = validate(updateSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { libelle, notes, regles } = parsed.data;

  const updated = await db.$transaction(async (tx) => {
    if (libelle !== undefined || notes !== undefined) {
      await tx.matriceVersion.update({
        where: { id },
        data: {
          ...(libelle !== undefined ? { libelle } : {}),
          ...(notes !== undefined ? { notes } : {}),
        },
      });
    }
    if (regles) {
      await tx.matriceRegle.deleteMany({ where: { versionId: id } });
      await tx.matriceRegle.createMany({
        data: regles.map((r) => ({
          versionId: id,
          code: r.code,
          libelle: r.libelle,
          categorie: r.categorie,
          obligatoire: r.obligatoire,
          condition: r.condition as never,
          niveauMin: r.niveauMin ?? null,
          meta: r.meta ?? "{}",
          ordre: r.ordre,
        })),
      });
    }
    return tx.matriceVersion.findUnique({
      where: { id },
      include: { regles: { orderBy: { ordre: "asc" } } },
    });
  });

  if (existing.statut === "ACTIVE") invalidateMatriceCache();

  await logAudit({
    session,
    action: "UPDATE",
    resource: "matrice",
    resourceId: id,
    details: `Matrice v${existing.numero} mise à jour`,
  });

  return NextResponse.json(updated);
}

/** DELETE — suppression définitive d'un brouillon uniquement. */
export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const gate = requirePermission((session.user as { role?: string }).role, "matrice.write");
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const { id } = await params;
  const existing = await db.matriceVersion.findUnique({
    where: { id },
    select: { id: true, numero: true, libelle: true, statut: true },
  });
  if (!existing) return NextResponse.json({ error: "Version introuvable" }, { status: 404 });

  if (existing.statut !== "BROUILLON") {
    return NextResponse.json(
      {
        error:
          existing.statut === "ACTIVE"
            ? "Impossible de supprimer la matrice ACTIVE. Créez et activez une autre version d'abord."
            : "Seuls les brouillons peuvent être supprimés.",
      },
      { status: 400 },
    );
  }

  // Les règles partent en cascade (onDelete: Cascade sur MatriceRegle)
  await db.matriceVersion.delete({ where: { id } });

  await logAudit({
    session,
    action: "DELETE",
    resource: "matrice",
    resourceId: id,
    details: `Brouillon matrice v${existing.numero} (« ${existing.libelle} ») supprimé`,
  });

  return NextResponse.json({ success: true, id });
}
