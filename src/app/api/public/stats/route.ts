import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const revalidate = 3600; // Cache 1 heure

// GET /api/public/stats — statistiques vitrine (public)
export async function GET() {
  try {
    const stats = await db.statistique.findMany({
      where: { actif: true },
      orderBy: { ordre: "asc" },
      select: { valeur: true, libelle: true },
    });
    return NextResponse.json(stats);
  } catch {
    return NextResponse.json([]);
  }
}
