import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { EtatDossier } from "@prisma/client";
import { workflowSchema, validate } from "@/lib/validations";

// POST /api/dossiers/[id]/workflow — transition de statut (staff uniquement)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role === "CANDIDAT") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = validate(workflowSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { action, note } = parsed.data;

  const dossier = await db.dossier.findUnique({ where: { id } });
  if (!dossier) {
    return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
  }

  // Map action → nouvel état
  const transitions: Record<string, EtatDossier> = {
    verifier: "PAIEMENT_ATTENTE",
    correction: "CORRECTION",
    verifier_corrections: "VERIFICATION",
    confirmer_paiement: "PAIEMENT_CONFIRME",
    transmettre: "TRANSMIS",
    accepter: "PRE_ADMISSION",
    refuser: "REFUSE",
    emettre_attestation: "ATTESTATION",
  };

  const nouvelEtat = transitions[action];
  if (!nouvelEtat) {
    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  }

  const etapeMap: Record<EtatDossier, number> = {
    BROUILLON: 1, SOUMIS: 2, VERIFICATION: 3, CORRECTION: 4,
    PAIEMENT_ATTENTE: 5, PAIEMENT_CONFIRME: 6, TRANSMIS: 7,
    ATTENTE_REPONSE: 8, PRE_ADMISSION: 9, REFUSE: 10,
    ATTESTATION: 11, CLOTURE: 12,
  };

  const updated = await db.dossier.update({
    where: { id },
    data: {
      etat: nouvelEtat,
      etapeActuelle: etapeMap[nouvelEtat],
    },
  });

  await db.historique.create({
    data: {
      dossierId: id,
      etat: nouvelEtat,
      auteur: `${(session.user as any).prenom} ${(session.user as any).nom}`,
      auteurId: (session.user as any).id,
      note: note || `Transition vers ${nouvelEtat.replace(/_/g, " ").toLowerCase()}`,
    },
  });

  return NextResponse.json({ success: true, dossier: updated });
}
