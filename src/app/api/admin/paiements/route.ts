import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { manualTransactionSchema } from "@/lib/validations";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";
import { requireApiPermission, parseOrRespond } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { lockDossierRow } from "@/lib/dossier/paiement-effects";
import { ETAPE_PAR_ETAT } from "@/shared/constants";

// POST /api/admin/paiements — transaction manuelle (staff uniquement)
//
// Body: { dossierId, montant, moyen, tranche? }
// - Permet à un staff d'enregistrer un paiement en espèces ou reçu hors ligne
// - Met à jour le statut de paiement du dossier (partiel/complet)
// - Ajoute une entrée à l'historique
export async function POST(request: Request) {
  const auth = await requireApiPermission("finance.write");
  if (!auth.ok) return auth.response;

  // Rate limiting (10 transactions / min / IP)
  const rateLimited = await checkRateLimit(getClientId(request), "/api/admin/paiements");
  if (rateLimited) return rateLimited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = parseOrRespond(manualTransactionSchema, body);
  if (!parsed.ok) return parsed.response;
  const { dossierId, montant, moyen, tranche } = parsed.data;

  // Générer une référence unique
  const ref = `REC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`;

  const userId = auth.user.id;
  const auteurLabel = `${auth.user.prenom} ${auth.user.nom}`;

  // Verrou de ligne + recalcul du statut de paiement À L'INTÉRIEUR de la transaction : un
  // encaissement manuel concurrent à un paiement en ligne (webhook PayTech) ne doit jamais
  // écraser le statut recalculé par l'autre avec une valeur figée avant son propre commit.
  let paiement;
  try {
    paiement = await db.$transaction(async (tx) => {
      await lockDossierRow(tx, dossierId);
      const dossier = await tx.dossier.findUnique({
        where: { id: dossierId },
        select: { id: true, candidatId: true, fraisAgence: true, etat: true },
      });
      if (!dossier) throw new Error("DOSSIER_NOT_FOUND");
      // Même garde que /api/paiements/initiate : un encaissement (manuel ou en ligne) ne peut
      // être enregistré qu'une fois le dossier vérifié et passé en phase de paiement.
      if (!["PAIEMENT_ATTENTE", "PAIEMENT_CONFIRME"].includes(dossier.etat)) {
        throw new Error("NOT_PAYABLE");
      }

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

      const totalPaye = await tx.paiement.aggregate({
        where: { dossierId, statut: "reussi" },
        _sum: { montant: true },
      });
      const paye = totalPaye._sum.montant ?? 0;
      const nouveauStatut = paye >= dossier.fraisAgence ? "complet" : "partiel";
      const advanceEtat = nouveauStatut === "complet" && dossier.etat === "PAIEMENT_ATTENTE";

      await tx.dossier.update({
        where: { id: dossierId },
        data: {
          paiementStatut: nouveauStatut,
          ...(advanceEtat
            ? { etat: "PAIEMENT_CONFIRME" as const, etapeActuelle: ETAPE_PAR_ETAT.PAIEMENT_CONFIRME }
            : {}),
        },
      });

      await tx.historique.create({
        data: {
          dossierId,
          etat: advanceEtat ? "PAIEMENT_CONFIRME" : dossier.etat,
          auteur: auteurLabel,
          auteurId: userId,
          note: `Paiement manuel ${moyen} confirmé : ${montant} FCFA (statut: ${nouveauStatut}).`,
        },
      });

      return created;
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "DOSSIER_NOT_FOUND") {
      return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
    }
    if (msg === "NOT_PAYABLE") {
      return NextResponse.json(
        { error: "Ce dossier n'est pas encore en phase de paiement (vérification staff requise)." },
        { status: 400 },
      );
    }
    throw e;
  }

  await logAudit({
    session: auth.session,
    action: "CREATE",
    resource: "paiement",
    resourceId: paiement.id,
    details: `Transaction manuelle ${paiement.reference} : ${montant} FCFA`,
  });

  return NextResponse.json({ success: true, paiement }, { status: 201 });
}

// GET /api/admin/paiements — alias de /api/admin/transactions (legacy)
export async function GET() {
  const auth = await requireApiPermission("finance.read");
  if (!auth.ok) return auth.response;

  const paiements = await db.paiement.findMany({
    include: {
      candidat: { select: { prenom: true, nom: true } },
      dossier: { select: { reference: true } },
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(paiements);
}
