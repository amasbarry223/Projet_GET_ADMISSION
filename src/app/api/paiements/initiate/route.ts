import { NextResponse } from "next/server";

/**
 * POST /api/paiements/initiate
 * Les paiements s'effectuent désormais hors plateforme (espèces en agence, virement, Wave/Orange Money direct).
 * Le candidat prend contact avec son conseiller qui procède à la validation avec le service financier.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Le règlement des frais d'agence s'effectue hors plateforme. Veuillez contacter votre conseiller via la messagerie.",
    },
    { status: 400 },
  );
}

export async function GET() {
  return NextResponse.json({
    mode: "hors_plateforme",
  });
}

