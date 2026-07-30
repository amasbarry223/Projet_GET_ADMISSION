import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/public/temoignages — témoignages vitrine (public)
export async function GET() {
  const temoignages = await db.temoignage.findMany({
    where: { actif: true },
    orderBy: { ordre: "asc" },
    select: { nom: true, parcours: true, pays: true, citation: true },
  });
  return NextResponse.json(temoignages);
}
