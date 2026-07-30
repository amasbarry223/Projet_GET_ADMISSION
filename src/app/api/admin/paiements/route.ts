import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { manualTransactionSchema, validate } from "@/lib/validations";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";

// POST /api/admin/paiements — transaction manuelle (staff uniquement)
//
// Body: { dossierId, montant, moyen, tranche? }
// - Permet à un staff d'enregistrer un paiement en espèces ou reçu hors ligne
// - Met à jour le statut de paiement du dossier (partiel/complet)
// - Ajoute une entrée à l'historique
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role === "CANDIDAT") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  // Rate limiting (10 transactions / min / IP)
  const rateLimited = checkRateLimit(getClientId(request), "/api/admin/paiements");
  if (rateLimited) return rateLimited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = validate(manualTransactionSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { dossierId, montant, moyen, tranche } = parsed.data;

  const dossier = await db.dossier.findUnique({
    where: { id: dossierId },
    select: { id: true, candidatId: true, reference: true, fraisAgence: true, paiementStatut: true },
  });
  if (!dossier) {
    return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
  }

  // Générer une référence unique
  const ref = `REC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`;

  const userId = (session.user as any).id;
  const auteurLabel = `${(session.user as any).prenom} ${(session.user as any).nom}`;

  // Calculer le nouveau statut de paiement (partiel vs complet)
  const paiementsExistants = await db.paiement.findMany({
    where: { dossierId, statut: "reussi" },
    select: { montant: true },
  });
  const totalPaye = paiementsExistants.reduce((sum, p) => sum + p.montant, 0) + montant;
  const nouveauStatut = totalPaye >= dossier.fraisAgence ? "complet" : "partiel";

  const paiement = await db.$transaction(async (tx) => {
    const created = await tx.paiement.create({
      data: {
        reference: ref,
        dossierId,
        candidatId: dossier.candidatId,
        montant,
        moyen,
        statut: "reussi",
        tranche: tranche || "Solde",
      },
    });

    await tx.dossier.update({
      where: { id: dossierId },
      data: { paiementStatut: nouveauStatut },
    });

    await tx.historique.create({
      data: {
        dossierId,
        etat: "PAIEMENT_CONFIRME",
        auteur: auteurLabel,
        auteurId: userId,
        note: `Paiement manuel ${moyen} confirmé : ${montant} FCFA (statut: ${nouveauStatut}).`,
      },
    });

    return created;
  });

  await logAudit({
    session,
    action: "CREATE",
    resource: "paiement",
    resourceId: paiement.id,
    details: `Transaction manuelle ${paiement.reference} : ${montant} FCFA`,
  });

  return NextResponse.json({ success: true, paiement }, { status: 201 });
}

// GET /api/admin/paiements — alias de /api/admin/transactions (legacy)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role === "CANDIDAT") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const paiements = await db.paiement.findMany({
    include: {
      candidat: { select: { prenom: true, nom: true } },
      dossier: { select: { reference: true } },
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(paiements);
}
