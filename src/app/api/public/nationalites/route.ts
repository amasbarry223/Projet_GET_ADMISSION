import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const revalidate = 3600; // Cache 1 heure

// GET /api/public/nationalites — liste des nationalités actives (noms seulement)
export async function GET() {
  const nationalites = await db.nationalite.findMany({ where: { actif: true }, orderBy: { ordre: "asc" } });
  return NextResponse.json(nationalites.map((n) => n.nom));
}
