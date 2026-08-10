import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const revalidate = 3600; // Cache 1 heure

// GET /api/public/temoignages — témoignages vitrine (public)
export async function GET() {
  try {
    const temoignages = await db.temoignage.findMany({
      where: { actif: true },
      orderBy: { ordre: "asc" },
      select: { nom: true, parcours: true, pays: true, citation: true },
    });
    return NextResponse.json(temoignages);
  } catch {
    return NextResponse.json([]);
  }
}
