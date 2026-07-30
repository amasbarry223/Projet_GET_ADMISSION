import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/public/objets-contact — objets de contact actifs (noms seulement)
export async function GET() {
  const objets = await db.objetContact.findMany({ where: { actif: true }, orderBy: { ordre: "asc" } });
  return NextResponse.json(objets.map((o) => o.nom));
}
