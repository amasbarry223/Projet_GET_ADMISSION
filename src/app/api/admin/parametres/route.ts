import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parametresSchema } from "@/lib/validations";
import { requireApiPermission, parseOrRespond } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { invalidateFraisCache } from "@/lib/dossier/frais-agence-server";

export async function GET() {
  const auth = await requireApiPermission("parametres.read");
  if (!auth.ok) return auth.response;

  let parametres = await db.parametre.findUnique({ where: { id: 1 } });
  if (!parametres) {
    parametres = await db.parametre.create({ data: {} });
  }

  return NextResponse.json(parametres);
}

export async function PUT(request: Request) {
  const auth = await requireApiPermission("parametres.write");
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = parseOrRespond(parametresSchema, body);
  if (!parsed.ok) return parsed.response;

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
    session: auth.session,
    action: "UPDATE",
    resource: "parametre",
    resourceId: "1",
    details: "Paramètres agence mis à jour",
  });

  return NextResponse.json(updated);
}
