import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { paiementSchema, validate } from "@/lib/validations";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";

// POST /api/paiements — enregistrer un paiement (mock — pas de vraie passerelle)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  // Rate limiting (10 paiements / min / IP)
  const rateLimited = checkRateLimit(getClientId(request), "/api/paiements");
  if (rateLimited) return rateLimited;

  const body = await request.json();
  const parsed = validate(paiementSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { dossierId, montant, moyen, tranche } = parsed.data;

  const userId = (session.user as any).id;
  const role = (session.user as any).role;

  const dossier = await db.dossier.findUnique({ where: { id: dossierId } });
  if (!dossier) {
    return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
  }

  // RBAC : candidat ne paie que son dossier
  if (role === "CANDIDAT" && dossier.candidatId !== userId) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  // Générer une référence unique
  const ref = `REC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`;

  const paiement = await db.paiement.create({
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

  // Mettre à jour le statut du dossier
  await db.dossier.update({
    where: { id: dossierId },
    data: { paiementStatut: "complet" },
  });

  // Ajouter à l'historique
  await db.historique.create({
    data: {
      dossierId,
      etat: "PAIEMENT_CONFIRME",
      auteur: `${(session.user as any).prenom} ${(session.user as any).nom}`,
      auteurId: userId,
      note: `Paiement ${moyen} confirmé : ${montant} FCFA.`,
    },
  });

  return NextResponse.json({ success: true, paiement }, { status: 201 });
}

// GET /api/paiements — liste (candidat: ses paiements ; staff: tous)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  let paiements;
  if (role === "CANDIDAT") {
    paiements = await db.paiement.findMany({
      where: { candidatId: userId },
      include: {
        dossier: { include: { universite: true, candidat: { select: { prenom: true, nom: true } } } },
      },
      orderBy: { date: "desc" },
    });
  } else {
    paiements = await db.paiement.findMany({
      include: {
        dossier: { include: { universite: true, candidat: { select: { prenom: true, nom: true } } } },
      },
      orderBy: { date: "desc" },
    });
  }

  return NextResponse.json(paiements);
}
