import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const revalidate = 3600; // Cache 1 heure

// GET /api/public/equipe — membres équipe vitrine (public)
export async function GET() {
  try {
    const equipe = await db.membreEquipe.findMany({
      where: { actif: true },
      orderBy: { ordre: "asc" },
      select: { initiales: true, nom: true, role: true },
    });
    return NextResponse.json(equipe);
  } catch {
    return NextResponse.json([]);
  }
}
