import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/public/moyens-paiement — moyens de paiement actifs
export async function GET() {
  const moyens = await db.moyenPaiement.findMany({ where: { actif: true }, orderBy: { ordre: "asc" } });
  return NextResponse.json(moyens);
}
