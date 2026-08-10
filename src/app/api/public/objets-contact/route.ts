import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const revalidate = 3600; // Cache 1 heure

// GET /api/public/objets-contact — objets de contact actifs (noms seulement)
export async function GET() {
  try {
    const objets = await db.objetContact.findMany({ where: { actif: true }, orderBy: { ordre: "asc" } });
    return NextResponse.json(objets.map((o) => o.nom));
  } catch {
    return NextResponse.json([]);
  }
}
