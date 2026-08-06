import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { formationSchema } from "@/lib/validations";
import { parseJsonArray } from "@/lib/parse-json";
import { requireApiPermission, parseOrRespond } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";

/** PUT /api/formations/[id] */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiPermission("catalogue.write");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const existing = await db.formation.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Formation introuvable" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = parseOrRespond(formationSchema, {
    intitule: body.intitule ?? existing.intitule,
    niveau: body.niveau ?? existing.niveau,
    domaine: body.domaine ?? existing.domaine,
    duree: body.duree ?? existing.duree,
    fraisAgence: body.fraisAgence,
    fraisFormationEuros:
      body.fraisFormationEuros === undefined
        ? existing.fraisFormationEuros
        : body.fraisFormationEuros,
    prerequis: body.prerequis ?? parseJsonArray(existing.prerequis),
    piecesRequises: body.piecesRequises ?? parseJsonArray(existing.piecesRequises),
  });
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  const formation = await db.formation.update({
    where: { id },
    data: {
      intitule: data.intitule,
      niveau: data.niveau,
      domaine: data.domaine,
      duree: data.duree,
      ...(data.fraisAgence !== undefined ? { fraisAgence: data.fraisAgence } : {}),
      ...(data.fraisFormationEuros !== undefined
        ? { fraisFormationEuros: data.fraisFormationEuros }
        : {}),
      prerequis: JSON.stringify(data.prerequis ?? []),
      piecesRequises: JSON.stringify(data.piecesRequises ?? []),
    },
  });

  await logAudit({
    session: auth.session,
    action: "UPDATE",
    resource: "universite",
    resourceId: id,
    details: `Formation mise à jour : ${formation.intitule}`,
  });

  return NextResponse.json({
    ...formation,
    prerequis: parseJsonArray(formation.prerequis),
    piecesRequises: parseJsonArray(formation.piecesRequises),
  });
}

/** DELETE /api/formations/[id] */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiPermission("catalogue.write");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const existing = await db.formation.findUnique({
    where: { id },
    include: { _count: { select: { dossiers: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Formation introuvable" }, { status: 404 });
  }
  if (existing._count.dossiers > 0) {
    return NextResponse.json(
      {
        error: `Impossible de supprimer : ${existing._count.dossiers} dossier(s) lié(s).`,
      },
      { status: 409 },
    );
  }

  await db.formation.delete({ where: { id } });
  await logAudit({
    session: auth.session,
    action: "DELETE",
    resource: "universite",
    resourceId: id,
    details: `Formation supprimée : ${existing.intitule}`,
  });

  return NextResponse.json({ success: true });
}
