import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseOrRespond } from "@/lib/api-auth";
import { paiementPatchSchema, paiementSchema, validate } from "@/lib/validations";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { hasPermission, requirePermission } from "@/lib/rbac";
import { randomBytes } from "node:crypto";
import {
  afterPaiementReussiSideEffects,
  applyPaiementReussiInTx,
  lockDossierRow,
  recomputePaiementStatutInTx,
} from "@/lib/dossier/paiement-effects";
import { broadcastDossierLive } from "@/lib/dossier/live-broadcast";

// POST /api/paiements — enregistrement staff uniquement (candidats → /api/paiements/initiate)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const role = session.user.role;
  if (role === "CANDIDAT") {
    return NextResponse.json(
      {
        error: "Utilisez le paiement en ligne sécurisé.",
        code: "USE_INITIATE",
        hint: "POST /api/paiements/initiate",
      },
      { status: 403 },
    );
  }

  const rateLimited = await checkRateLimit(getClientId(request), "/api/paiements");
  if (rateLimited) return rateLimited;

  const body = await request.json();
  const parsed = validate(paiementSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { dossierId, montant, moyen, tranche } = parsed.data;
  const forceStatut = typeof body.statut === "string" ? body.statut : null;

  const userId = session.user.id;
  const auteurLabel = `${session.user.prenom} ${session.user.nom}`;

  const dossierProbe = await db.dossier.findUnique({
    where: { id: dossierId },
    select: { id: true, candidatId: true, etat: true },
  });
  if (!dossierProbe) {
    return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
  }

  const gate = requirePermission(role, "finance.write");
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  let statut = "reussi";
  if (forceStatut && ["en_attente", "reussi", "echoue", "rembourse"].includes(forceStatut)) {
    statut = forceStatut;
  }

  const ref = `REC-${new Date().getFullYear()}-${randomBytes(3).toString("hex").toUpperCase()}`;

  type TxResult = {
    paiement: {
      id: string;
      reference: string;
      montant: number;
      moyen: string;
      dossierId: string;
      statut: string;
    };
    candidatId: string;
    candidat: { email: string | null; prenom: string };
    etatApres?: string;
  };

  let result: TxResult;
  try {
    result = await db.$transaction(async (tx) => {
      await lockDossierRow(tx, dossierId);
      const locked = await tx.dossier.findUnique({
        where: { id: dossierId },
        include: { candidat: { select: { email: true, prenom: true } } },
      });
      if (!locked) throw new Error("DOSSIER_NOT_FOUND");

      const paiement = await tx.paiement.create({
        data: {
          reference: ref,
          dossierId,
          candidatId: locked.candidatId,
          montant,
          moyen,
          statut,
          tranche: tranche || "Solde",
        },
      });

      let etatApres: string | undefined;
      if (statut === "reussi") {
        const applied = await applyPaiementReussiInTx(tx, {
          paiement,
          dossier: locked,
          userId,
          auteurLabel,
        });
        etatApres = applied.etat;
      } else if (statut === "en_attente") {
        await tx.historique.create({
          data: {
            dossierId,
            etat: locked.etat,
            auteur: auteurLabel,
            auteurId: userId,
            note: `Paiement ${moyen} déclaré : ${montant} FCFA — en attente de validation.`,
          },
        });
      } else if (statut === "echoue") {
        await tx.historique.create({
          data: {
            dossierId,
            etat: locked.etat,
            auteur: "Système",
            note: `Paiement ${moyen} échoué : ${montant} FCFA.`,
          },
        });
      }

      return {
        paiement,
        candidatId: locked.candidatId,
        candidat: locked.candidat,
        ...(etatApres !== undefined ? { etatApres } : {}),
      };
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "DOSSIER_NOT_FOUND") {
      return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
    }
    if (msg === "NOT_PAYABLE") {
      return NextResponse.json(
        { error: "Dossier non encore en phase paiement" },
        { status: 403 },
      );
    }
    if (msg === "NO_RESTE") {
      return NextResponse.json(
        { error: "Aucun reste dû (paiements confirmés ou déjà en attente)" },
        { status: 400 },
      );
    }
    if (msg.startsWith("RESTE:")) {
      const reste = msg.slice(6);
      return NextResponse.json(
        { error: `Montant supérieur au reste dû (${reste} FCFA)` },
        { status: 400 },
      );
    }
    throw e;
  }

  await logAudit({
    session,
    action: "CREATE",
    resource: "paiement",
    resourceId: result.paiement.id,
    details: `Paiement ${result.paiement.reference} : ${montant} FCFA via ${moyen} (${statut})`,
  });

  if (statut === "reussi" && result.etatApres) {
    await afterPaiementReussiSideEffects({
      paiement: result.paiement,
      candidatId: result.candidatId,
      candidat: result.candidat,
      etat: result.etatApres,
    });
  } else if (statut === "en_attente") {
    await createNotification({
      userId: result.candidatId,
      titre: "Paiement en cours de validation",
      message: `Votre paiement ${ref} de ${montant} FCFA est en attente de confirmation par l'agence.`,
      type: "paiement",
      lien: "/espace/paiement",
      dossierId,
    });
    void broadcastDossierLive({
      dossierId,
      candidatId: result.candidatId,
      etat: dossierProbe.etat,
    });
  } else if (statut === "echoue") {
    await createNotification({
      userId: result.candidatId,
      titre: "Paiement échoué",
      message: `Le paiement via ${moyen} a échoué. Veuillez réessayer.`,
      type: "alerte",
      lien: "/espace/paiement",
      dossierId,
    });
  }

  return NextResponse.json(
    { success: true, pending: statut === "en_attente", paiement: result.paiement },
    { status: 201 },
  );
}

// PATCH /api/paiements — confirmer / rembourser / rejeter (staff finance)
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const role = session.user.role;
  if (!hasPermission(role, "finance.write")) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }
  const parsed = parseOrRespond(paiementPatchSchema, body);
  if (!parsed.ok) return parsed.response;
  const { id, statut } = parsed.data;

  const userId = session.user.id;
  const auteurLabel = `${session.user.prenom} ${session.user.nom}`;

  type PatchResult = {
    paiement: { id: string; reference: string; montant: number; moyen: string; dossierId: string; statut: string };
    candidatId: string;
    candidat: { email: string | null; prenom: string };
    etatApres?: string;
    sideEffect: "reussi" | "rembourse" | "echoue" | "none";
    idempotent?: boolean;
  };

  let outcome: PatchResult;
  try {
    outcome = await db.$transaction(async (tx) => {
      const existing = await tx.paiement.findUnique({ where: { id } });
      if (!existing) throw new Error("PAIEMENT_NOT_FOUND");

      if (statut === "reussi" && existing.statut === "reussi") {
        return {
          paiement: existing,
          candidatId: existing.candidatId,
          candidat: { email: null, prenom: "" },
          sideEffect: "none" as const,
          idempotent: true,
        };
      }

      const from = existing.statut;
      const allowed: Record<string, string[]> = {
        en_attente: ["reussi", "echoue", "en_attente"],
        reussi: ["rembourse"],
        echoue: ["en_attente", "reussi"],
        rembourse: [],
      };
      if (!(allowed[from] ?? []).includes(statut)) {
        throw new Error(`TRANSITION:${from}:${statut}`);
      }

      await lockDossierRow(tx, existing.dossierId);
      const dossierBefore = await tx.dossier.findUnique({
        where: { id: existing.dossierId },
        include: { candidat: { select: { email: true, prenom: true } } },
      });
      if (!dossierBefore) throw new Error("DOSSIER_NOT_FOUND");

      const postTransmission = [
        "TRANSMIS",
        "ATTENTE_REPONSE",
        "PRE_ADMISSION",
        "ATTESTATION",
        "CLOTURE",
        "REFUSE",
      ];
      if (
        (statut === "rembourse" || statut === "echoue") &&
        postTransmission.includes(dossierBefore.etat)
      ) {
        throw new Error("POST_TRANSMISSION");
      }

      const paiement = await tx.paiement.update({
        where: { id },
        data: { statut },
      });

      if (statut === "reussi") {
        const applied = await applyPaiementReussiInTx(tx, {
          paiement,
          dossier: dossierBefore,
          userId,
          auteurLabel,
        });
        return {
          paiement,
          candidatId: dossierBefore.candidatId,
          candidat: dossierBefore.candidat,
          etatApres: applied.etat,
          sideEffect: "reussi" as const,
        };
      }

      if (statut === "rembourse" || statut === "echoue") {
        await recomputePaiementStatutInTx(tx, dossierBefore, {
          userId,
          auteurLabel,
          reason: statut,
        });
        return {
          paiement,
          candidatId: dossierBefore.candidatId,
          candidat: dossierBefore.candidat,
          etatApres: dossierBefore.etat,
          sideEffect: statut as "rembourse" | "echoue",
        };
      }

      return {
        paiement,
        candidatId: dossierBefore.candidatId,
        candidat: dossierBefore.candidat,
        sideEffect: "none" as const,
      };
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "PAIEMENT_NOT_FOUND") {
      return NextResponse.json({ error: "Paiement non trouvé" }, { status: 404 });
    }
    if (msg === "DOSSIER_NOT_FOUND") {
      return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
    }
    if (msg === "POST_TRANSMISSION") {
      return NextResponse.json(
        {
          error:
            "Impossible de rembourser ou rejeter un paiement : le dossier a déjà été transmis ou clôturé. Annulez d'abord l'avancement workflow.",
        },
        { status: 400 },
      );
    }
    if (msg.startsWith("TRANSITION:")) {
      const [, from, to] = msg.split(":");
      return NextResponse.json(
        { error: `Transition paiement interdite : ${from} → ${to}` },
        { status: 400 },
      );
    }
    throw e;
  }

  if (outcome.idempotent) {
    return NextResponse.json({ success: true, paiement: outcome.paiement, idempotent: true });
  }

  if (outcome.sideEffect === "reussi" && outcome.etatApres) {
    await afterPaiementReussiSideEffects({
      paiement: outcome.paiement,
      candidatId: outcome.candidatId,
      candidat: outcome.candidat,
      etat: outcome.etatApres,
    });
  } else if (outcome.sideEffect === "rembourse") {
    await createNotification({
      userId: outcome.candidatId,
      titre: "Remboursement effectué",
      message: `Le paiement ${outcome.paiement.reference} a été remboursé.`,
      type: "paiement",
      lien: "/espace/paiement",
      dossierId: outcome.paiement.dossierId,
    });
    void broadcastDossierLive({
      dossierId: outcome.paiement.dossierId,
      candidatId: outcome.candidatId,
      etat: outcome.etatApres ?? "PAIEMENT_ATTENTE",
    });
  } else if (outcome.sideEffect === "echoue") {
    await createNotification({
      userId: outcome.candidatId,
      titre: "Paiement rejeté",
      message: `Le paiement ${outcome.paiement.reference} a été rejeté. Veuillez réessayer ou contacter l'agence.`,
      type: "alerte",
      lien: "/espace/paiement",
      dossierId: outcome.paiement.dossierId,
    });
    void broadcastDossierLive({
      dossierId: outcome.paiement.dossierId,
      candidatId: outcome.candidatId,
      etat: outcome.etatApres ?? "PAIEMENT_ATTENTE",
    });
  }

  await logAudit({
    session,
    action: "UPDATE",
    resource: "paiement",
    resourceId: id,
    details: `Statut paiement → ${statut}`,
  });

  return NextResponse.json({ success: true, paiement: outcome.paiement });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const role = session.user.role;
  const userId = session.user.id;

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
    if (!hasPermission(role, "finance.read") && !hasPermission(role, "dossiers.read")) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
    paiements = await db.paiement.findMany({
      include: {
        dossier: { include: { universite: true, candidat: { select: { prenom: true, nom: true } } } },
      },
      orderBy: { date: "desc" },
    });
  }

  return NextResponse.json(paiements);
}
