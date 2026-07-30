import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/attestations/[dossierId] — attestation d'un dossier (auth requis)
//
// RBAC : candidat propriétaire du dossier OU staff
export async function GET(
  request: Request,
  { params }: { params: Promise<{ dossierId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { dossierId } = await params;
  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  const dossier = await db.dossier.findUnique({
    where: { id: dossierId },
    select: { candidatId: true, reference: true, etat: true },
  });
  if (!dossier) {
    return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
  }

  // RBAC : candidat ne voit que son attestation
  if (role === "CANDIDAT" && dossier.candidatId !== userId) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const attestation = await db.attestation.findUnique({
    where: { dossierId },
    include: {
      emetteur: { select: { prenom: true, nom: true, role: true } },
      dossier: {
        select: {
          reference: true,
          candidat: { select: { prenom: true, nom: true, nationalite: true, email: true } },
          universite: { select: { nom: true, pays: true, drapeau: true } },
          formation: { select: { intitule: true, niveau: true, domaine: true } },
        },
      },
    },
  });

  if (!attestation) {
    return NextResponse.json(
      { error: "Aucune attestation émise pour ce dossier" },
      { status: 404 }
    );
  }

  return NextResponse.json(attestation);
}
