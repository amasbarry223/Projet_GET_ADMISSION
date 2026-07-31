import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/** Paramètres publics non sensibles (BF-23) */
export async function GET() {
  let parametres = await db.parametre.findUnique({ where: { id: 1 } });
  if (!parametres) {
    parametres = await db.parametre.create({ data: {} });
  }
  return NextResponse.json({
    paiementTranches: parametres.paiementTranches,
    fraisMin: parametres.fraisMin,
    fraisMax: parametres.fraisMax,
  });
}
