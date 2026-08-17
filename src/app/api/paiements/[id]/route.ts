import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiCandidat } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit";
import { lockDossierRow, recomputePaiementStatutInTx } from "@/lib/dossier/paiement-effects";
import { broadcastDossierLive } from "@/lib/dossier/live-broadcast";
import { formatFCFA } from "@/lib/format";

// DELETE /api/paiements/[id] — un candidat supprime sa propre transaction (quel que soit son
// statut : la confirmation de paiement étant automatique sur cette plateforme, la quasi-totalité
// des transactions sont "reussi" — restreindre aux statuts non finalisés viderait la fonctionnalité
// de son intérêt). Le staff n'a plus accès à cette suppression : la trace financière officielle
// reste celle du candidat qui l'a lui-même déclarée.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiCandidat();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const userId = auth.user.id;
  const auteurLabel = `${auth.user.prenom} ${auth.user.nom}`;

  type DeleteResult = {
    paiement: { id: string; reference: string; montant: number; dossierId: string };
    etatApres: string;
  };

  let outcome: DeleteResult;
  try {
    outcome = await db.$transaction(async (tx) => {
      const existing = await tx.paiement.findUnique({ where: { id } });
      if (!existing || existing.candidatId !== userId) throw new Error("PAIEMENT_NOT_FOUND");

      // Un paiement confirmé ou remboursé ne peut pas être supprimé par le candidat :
      // seul le staff Finance peut gérer son cycle de vie.
      if (existing.statut === "reussi") throw new Error("PAIEMENT_REUSSI");
      if (existing.statut === "rembourse") throw new Error("PAIEMENT_REMBOURSE");

      await lockDossierRow(tx, existing.dossierId);
      const dossier = await tx.dossier.findUnique({ where: { id: existing.dossierId } });
      if (!dossier) throw new Error("DOSSIER_NOT_FOUND");

      const postTransmission = [
        "TRANSMIS",
        "ATTENTE_REPONSE",
        "PRE_ADMISSION",
        "ATTESTATION",
        "CLOTURE",
        "REFUSE",
      ];
      if (postTransmission.includes(dossier.etat)) {
        throw new Error("POST_TRANSMISSION");
      }

      await tx.paiement.delete({ where: { id } });

      const { paiementStatut } = await recomputePaiementStatutInTx(tx, dossier, {
        userId,
        auteurLabel,
        reason: "suppression",
      });

      await tx.historique.create({
        data: {
          dossierId: dossier.id,
          etat: dossier.etat,
          auteur: auteurLabel,
          auteurId: userId,
          note: `Transaction ${existing.reference} (${formatFCFA(existing.montant)}) supprimée par le candidat.`,
        },
      });

      return {
        paiement: {
          id: existing.id,
          reference: existing.reference,
          montant: existing.montant,
          dossierId: existing.dossierId,
        },
        etatApres: paiementStatut === dossier.paiementStatut ? dossier.etat : "PAIEMENT_ATTENTE",
      };
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "PAIEMENT_NOT_FOUND") {
      return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });
    }
    if (msg === "PAIEMENT_REUSSI") {
      return NextResponse.json(
        {
          error:
            "Un paiement confirmé ne peut pas être supprimé. Utilisez le bouton \"Demander un remboursement\" ou contactez l'agence.",
        },
        { status: 400 },
      );
    }
    if (msg === "PAIEMENT_REMBOURSE") {
      return NextResponse.json(
        {
          error:
            "Une transaction remboursée fait partie de l'historique comptable et ne peut pas être supprimée.",
        },
        { status: 400 },
      );
    }
    if (msg === "DOSSIER_NOT_FOUND") {
      return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
    }
    if (msg === "POST_TRANSMISSION") {
      return NextResponse.json(
        {
          error:
            "Impossible de supprimer cette transaction : le dossier a déjà été transmis ou clôturé.",
        },
        { status: 400 },
      );
    }
    throw e;
  }

  void broadcastDossierLive({
    dossierId: outcome.paiement.dossierId,
    candidatId: userId,
    etat: outcome.etatApres,
  });

  await logAudit({
    session: auth.session,
    action: "DELETE",
    resource: "paiement",
    resourceId: id,
    details: `Transaction ${outcome.paiement.reference} supprimée par le candidat (${formatFCFA(outcome.paiement.montant)})`,
  });

  return NextResponse.json({ success: true });
}
