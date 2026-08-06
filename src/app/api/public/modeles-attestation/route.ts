import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseOrRespond, requireApiPermission } from "@/lib/api-auth";
import { modeleAttestationCreateSchema } from "@/lib/validations";

export const revalidate = 3600;

// GET /api/public/modeles-attestation — modèles d'attestation actifs
export async function GET() {
  const modeles = await db.modeleAttestation.findMany({ where: { actif: true }, orderBy: { ordre: "asc" } });
  return NextResponse.json(modeles);
}

// POST /api/public/modeles-attestation — créer un modèle (staff uniquement)
export async function POST(request: Request) {
  const auth = await requireApiPermission("attestations.emit");
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const parsed = parseOrRespond(modeleAttestationCreateSchema, body);
  if (!parsed.ok) return parsed.response;
  const { nom, description } = parsed.data;

  const maxOrdre = await db.modeleAttestation.aggregate({ _max: { ordre: true } });
  const modele = await db.modeleAttestation.create({
    data: {
      nom,
      description: description ?? "",
      ordre: (maxOrdre._max.ordre ?? 0) + 1,
    },
  });

  return NextResponse.json(modele, { status: 201 });
}
