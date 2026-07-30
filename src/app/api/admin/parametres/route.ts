import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { parametresSchema, validate } from "@/lib/validations";

// GET /api/admin/parametres — récupérer les paramètres (staff uniquement)
//
// Si aucun enregistrement n'existe encore, on le crée avec les valeurs par défaut.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role === "CANDIDAT") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  let parametres = await db.parametre.findUnique({ where: { id: 1 } });
  if (!parametres) {
    parametres = await db.parametre.create({ data: {} });
  }

  return NextResponse.json(parametres);
}

// PUT /api/admin/parametres — mettre à jour les paramètres (super_admin uniquement)
//
// Body: { fraisMin?, fraisMax?, paiementTranches? }
// - Seul un SUPER_ADMIN peut modifier les paramètres
// - Validation : fraisMax >= fraisMin
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
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
  const { fraisMin, fraisMax, paiementTranches } = parsed.data;

  // S'assurer que l'enregistrement existe
  let existing = await db.parametre.findUnique({ where: { id: 1 } });
  if (!existing) {
    existing = await db.parametre.create({ data: {} });
  }

  // Validation cohérence fraisMin/fraisMax
  const newFraisMin = fraisMin ?? existing.fraisMin;
  const newFraisMax = fraisMax ?? existing.fraisMax;
  if (newFraisMax < newFraisMin) {
    return NextResponse.json(
      { error: "fraisMax doit être supérieur ou égal à fraisMin" },
      { status: 400 }
    );
  }

  const data: { fraisMin?: number; fraisMax?: number; paiementTranches?: boolean } = {};
  if (fraisMin !== undefined) data.fraisMin = fraisMin;
  if (fraisMax !== undefined) data.fraisMax = fraisMax;
  if (paiementTranches !== undefined) data.paiementTranches = paiementTranches;

  const updated = await db.parametre.update({
    where: { id: 1 },
    data,
  });

  return NextResponse.json(updated);
}
