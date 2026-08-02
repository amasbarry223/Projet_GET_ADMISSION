import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { parametresSchema, validate } from "@/lib/validations";
import { requirePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { invalidateFraisCache } from "@/lib/dossier/frais-agence-server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const gate = requirePermission((session.user as { role?: string }).role, "parametres.read");
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let parametres = await db.parametre.findUnique({ where: { id: 1 } });
  if (!parametres) {
    parametres = await db.parametre.create({ data: {} });
  }

  return NextResponse.json(parametres);
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const gate = requirePermission((session.user as { role?: string }).role, "parametres.write");
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = validate(parametresSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  let existing = await db.parametre.findUnique({ where: { id: 1 } });
  if (!existing) {
    existing = await db.parametre.create({ data: {} });
  }

  const data = parsed.data;
  const newPublic = data.fraisAgencePublic ?? existing.fraisAgencePublic ?? existing.fraisMin;
  const newPrive = data.fraisAgencePrive ?? existing.fraisAgencePrive ?? existing.fraisMax;
  const newFraisMin = data.fraisMin ?? newPublic;
  const newFraisMax = data.fraisMax ?? newPrive;
  if (newFraisMax < newFraisMin) {
    return NextResponse.json(
      { error: "fraisMax doit être supérieur ou égal à fraisMin" },
      { status: 400 }
    );
  }

  const updated = await db.parametre.update({
    where: { id: 1 },
    data: {
      ...(data.fraisMin !== undefined ? { fraisMin: data.fraisMin } : { fraisMin: newPublic }),
      ...(data.fraisMax !== undefined ? { fraisMax: data.fraisMax } : { fraisMax: newPrive }),
      ...(data.fraisAgencePublic !== undefined
        ? { fraisAgencePublic: data.fraisAgencePublic }
        : {}),
      ...(data.fraisAgencePrive !== undefined
        ? { fraisAgencePrive: data.fraisAgencePrive }
        : {}),
      ...(data.paiementTranches !== undefined ? { paiementTranches: data.paiementTranches } : {}),
      ...(data.notifEmail !== undefined ? { notifEmail: data.notifEmail } : {}),
      ...(data.notifInApp !== undefined ? { notifInApp: data.notifInApp } : {}),
      ...(data.workflowStrict !== undefined ? { workflowStrict: data.workflowStrict } : {}),
      ...(data.exigerEmailVerifie !== undefined ? { exigerEmailVerifie: data.exigerEmailVerifie } : {}),
      ...(data.mentionsLegales !== undefined ? { mentionsLegales: data.mentionsLegales } : {}),
      ...(data.politiqueConfidentialite !== undefined
        ? { politiqueConfidentialite: data.politiqueConfidentialite }
        : {}),
    },
  });

  invalidateFraisCache();

  await logAudit({
    session,
    action: "UPDATE",
    resource: "parametre",
    resourceId: "1",
    details: "Paramètres agence mis à jour",
  });

  return NextResponse.json(updated);
}
