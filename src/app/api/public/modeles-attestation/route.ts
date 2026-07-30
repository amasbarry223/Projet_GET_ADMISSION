import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const revalidate = 3600; // Cache 1 heure

// GET /api/public/modeles-attestation — modèles d'attestation actifs
export async function GET() {
  const modeles = await db.modeleAttestation.findMany({ where: { actif: true }, orderBy: { ordre: "asc" } });
  return NextResponse.json(modeles);
}
