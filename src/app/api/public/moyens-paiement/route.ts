import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const revalidate = 3600; // Cache 1 heure

// GET /api/public/moyens-paiement — moyens de paiement actifs
export async function GET() {
  try {
    const moyens = await db.moyenPaiement.findMany({ where: { actif: true }, orderBy: { ordre: "asc" } });
    return NextResponse.json(moyens);
  } catch {
    return NextResponse.json([]);
  }
}
