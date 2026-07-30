import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/public/modeles-attestation — modèles d'attestation actifs
export async function GET() {
  const modeles = await db.modeleAttestation.findMany({ where: { actif: true }, orderBy: { ordre: "asc" } });
  return NextResponse.json(modeles);
}
