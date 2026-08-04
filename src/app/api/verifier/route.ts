import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";

// GET /api/verifier?code=VRF-XXXX — vérification authenticité attestation (BF-32)
export async function GET(request: Request) {
  const rateLimited = await checkRateLimit(getClientId(request), "/api/verifier");
  if (rateLimited) return rateLimited;

  const { searchParams } = new URL(request.url);
  const code = (searchParams.get("code") || "").trim().toUpperCase();

  if (!code) {
    return NextResponse.json({ error: "Code de vérification requis" }, { status: 400 });
  }

  const attestation = await db.attestation.findUnique({
    where: { codeVerification: code },
    include: {
      dossier: {
        include: {
          candidat: { select: { prenom: true, nom: true } },
          universite: { select: { nom: true, pays: true } },
          formation: { select: { intitule: true, niveau: true } },
        },
      },
      emetteur: { select: { prenom: true, nom: true } },
    },
  });

  if (!attestation) {
    return NextResponse.json({ valide: false, error: "Code invalide ou attestation introuvable" }, { status: 404 });
  }

  return NextResponse.json({
    valide: true,
    reference: attestation.reference,
    codeVerification: attestation.codeVerification,
    dateEmission: attestation.dateEmission,
    modeRemise: attestation.modeRemise,
    candidat: `${attestation.dossier.candidat.prenom} ${attestation.dossier.candidat.nom}`,
    universite: attestation.dossier.universite.nom,
    pays: attestation.dossier.universite.pays,
    formation: attestation.dossier.formation.intitule,
    niveau: attestation.dossier.formation.niveau,
    dossierRef: attestation.dossier.reference,
    emetteur: `${attestation.emetteur.prenom} ${attestation.emetteur.nom}`,
    dateEmissionLabel: formatDate(
      attestation.dateEmission instanceof Date
        ? attestation.dateEmission.toISOString()
        : String(attestation.dateEmission)
    ),
  });
}
