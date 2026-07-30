import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/public/stats — statistiques vitrine (public)
export async function GET() {
  const stats = await db.statistique.findMany({
    where: { actif: true },
    orderBy: { ordre: "asc" },
    select: { valeur: true, libelle: true },
  });
  return NextResponse.json(stats);
}
