import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { paiementSchema, validate } from "@/lib/validations";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { sendMail } from "@/lib/mail";
import { hasPermission, requirePermission } from "@/lib/rbac";
import { randomBytes } from "node:crypto";

const ETAPE_MAP = {
  PAIEMENT_CONFIRME: 6,
} as const;

async function applyPaiementReussi(opts: {
  paiement: { id: string; reference: string; montant: number; moyen: string; dossierId: string };
  dossier: {
    id: string;
    etat: string;
    fraisAgence: number;
    candidatId: string;
    candidat: { email: string | null; prenom: string };
  };
  userId: string;
  auteurLabel: string;
}) {
  const { paiement, dossier, userId, auteurLabel } = opts;
  const totalPaye = await db.paiement.aggregate({
    where: { dossierId: dossier.id, statut: "reussi" },
    _sum: { montant: true },
  });
  const paye = totalPaye._sum.montant ?? 0;
  const paiementStatut = paye >= dossier.fraisAgence ? "complet" : paye > 0 ? "partiel" : "aucun";

  const updateData: {
    paiementStatut: string;
    etat?: "PAIEMENT_CONFIRME";
    etapeActuelle?: number;
  } = { paiementStatut };

  if (dossier.etat === "PAIEMENT_ATTENTE" && paiementStatut === "complet") {
    updateData.etat = "PAIEMENT_CONFIRME";
    updateData.etapeActuelle = ETAPE_MAP.PAIEMENT_CONFIRME;
  }

  await db.dossier.update({ where: { id: dossier.id }, data: updateData });

  await db.historique.create({
    data: {
      dossierId: dossier.id,
      etat: updateData.etat ?? dossier.etat,
      auteur: auteurLabel,
      auteurId: userId,
      note: `Paiement ${paiement.moyen} confirmé : ${paiement.montant} FCFA (${paiementStatut}).`,
    },
  });

  await createNotification({
    userId: dossier.candidatId,
    titre: "Paiement confirmé",
    message: `Votre paiement ${paiement.reference} de ${paiement.montant} FCFA a été confirmé.`,
    type: "paiement",
    lien: "/espace/paiement",
    dossierId: dossier.id,
  });

  if (dossier.candidat.email) {
    await sendMail({
      to: dossier.candidat.email,
      subject: `Reçu ${paiement.reference} — GET Admission`,
      html: `<p>Bonjour ${dossier.candidat.prenom},</p><p>Votre paiement de <strong>${paiement.montant} FCFA</strong> a été confirmé (réf. ${paiement.reference}).</p><p><a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/recu/${paiement.id}">Télécharger le reçu</a></p>`,
    });
  }
}

// POST /api/paiements — enregistrer un paiement (candidat → en_attente ; staff peut forcer le statut)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const rateLimited = checkRateLimit(getClientId(request), "/api/paiements");
  if (rateLimited) return rateLimited;

  const body = await request.json();
  const parsed = validate(paiementSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { dossierId, montant, moyen, tranche } = parsed.data;
  const forceStatut = typeof body.statut === "string" ? body.statut : null;

  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role?: string }).role;
  const auteurLabel = `${(session.user as { prenom: string }).prenom} ${(session.user as { nom: string }).nom}`;

  const dossier = await db.dossier.findUnique({
    where: { id: dossierId },
    include: { candidat: { select: { email: true, prenom: true } } },
  });
  if (!dossier) {
    return NextResponse.json({ error: "Dossier non trouvé" }, { status: 404 });
  }

  if (role === "CANDIDAT" && dossier.candidatId !== userId) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  if (role !== "CANDIDAT") {
    const gate = requirePermission(role, "finance.write");
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  if (role === "CANDIDAT") {
    const etatOk =
      dossier.etat === "PAIEMENT_ATTENTE" || dossier.paiementStatut === "partiel";
    if (!etatOk) {
      return NextResponse.json(
        { error: "Dossier non encore en phase paiement" },
        { status: 403 }
      );
    }

    const [totalConfirme, totalPending] = await Promise.all([
      db.paiement.aggregate({
        where: { dossierId: dossier.id, statut: "reussi" },
        _sum: { montant: true },
      }),
      db.paiement.aggregate({
        where: { dossierId: dossier.id, statut: "en_attente" },
        _sum: { montant: true },
      }),
    ]);
    const engage = (totalConfirme._sum.montant ?? 0) + (totalPending._sum.montant ?? 0);
    const reste = Math.max(0, dossier.fraisAgence - engage);
    if (montant <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }
    if (reste <= 0) {
      return NextResponse.json(
        { error: "Aucun reste dû (paiements confirmés ou déjà en attente)" },
        { status: 400 }
      );
    }
    if (montant > reste) {
      return NextResponse.json(
        { error: `Montant supérieur au reste dû (${reste} FCFA)` },
        { status: 400 }
      );
    }
  }

  // Candidat : toujours en_attente (validation finance). Staff finance : peut forcer un statut.
  let statut = "en_attente";
  if (forceStatut && ["en_attente", "reussi", "echoue", "rembourse"].includes(forceStatut)) {
    if (role === "CANDIDAT") {
      return NextResponse.json({ error: "Statut non autorisé" }, { status: 403 });
    }
    statut = forceStatut;
  } else if (role !== "CANDIDAT") {
    statut = "reussi";
  }

  const ref = `REC-${new Date().getFullYear()}-${randomBytes(3).toString("hex").toUpperCase()}`;

  const paiement = await db.paiement.create({
    data: {
      reference: ref,
      dossierId,
      candidatId: dossier.candidatId,
      montant,
      moyen,
      statut,
      tranche: tranche || "Solde",
    },
  });

  await logAudit({
    session,
    action: "CREATE",
    resource: "paiement",
    resourceId: paiement.id,
    details: `Paiement ${paiement.reference} : ${montant} FCFA via ${moyen} (${statut})`,
  });

  if (statut === "reussi") {
    await applyPaiementReussi({
      paiement,
      dossier,
      userId,
      auteurLabel,
    });
  } else if (statut === "en_attente") {
    await db.historique.create({
      data: {
        dossierId,
        etat: dossier.etat,
        auteur: auteurLabel,
        auteurId: userId,
        note: `Paiement ${moyen} déclaré : ${montant} FCFA — en attente de validation.`,
      },
    });
    await createNotification({
      userId: dossier.candidatId,
      titre: "Paiement en cours de validation",
      message: `Votre paiement ${ref} de ${montant} FCFA est en attente de confirmation par l'agence.`,
      type: "paiement",
      lien: "/espace/paiement",
      dossierId,
    });
  } else if (statut === "echoue") {
    await db.historique.create({
      data: {
        dossierId,
        etat: dossier.etat,
        auteur: "Système",
        note: `Paiement ${moyen} échoué : ${montant} FCFA.`,
      },
    });
    await createNotification({
      userId: dossier.candidatId,
      titre: "Paiement échoué",
      message: `Le paiement via ${moyen} a échoué. Veuillez réessayer.`,
      type: "alerte",
      lien: "/espace/paiement",
      dossierId,
    });
  }

  return NextResponse.json(
    { success: true, pending: statut === "en_attente", paiement },
    { status: 201 }
  );
}

// PATCH /api/paiements — confirmer / rembourser / rejeter (staff finance)
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role;
  if (!hasPermission(role, "finance.write")) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await request.json();
  const id = String(body.id || "");
  const statut = String(body.statut || "");
  if (!id || !["rembourse", "echoue", "reussi", "en_attente"].includes(statut)) {
    return NextResponse.json({ error: "id et statut valides requis" }, { status: 400 });
  }

  const existing = await db.paiement.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Paiement non trouvé" }, { status: 404 });
  }

  // Idempotence : déjà réussi → no-op (évite double notifs / e-mails)
  if (statut === "reussi" && existing.statut === "reussi") {
    return NextResponse.json({ success: true, paiement: existing, idempotent: true });
  }

  const paiement = await db.paiement.update({
    where: { id },
    data: { statut },
  });

  const userId = (session.user as { id: string }).id;
  const auteurLabel = `${(session.user as { prenom: string }).prenom} ${(session.user as { nom: string }).nom}`;

  if (statut === "reussi") {
    const dossier = await db.dossier.findUnique({
      where: { id: paiement.dossierId },
      include: { candidat: { select: { email: true, prenom: true } } },
    });
    if (dossier) {
      await applyPaiementReussi({
        paiement,
        dossier,
        userId,
        auteurLabel,
      });
    }
  } else if (statut === "rembourse" || statut === "echoue") {
    const dossier = await db.dossier.findUnique({ where: { id: paiement.dossierId } });
    if (dossier) {
      const totalPaye = await db.paiement.aggregate({
        where: { dossierId: dossier.id, statut: "reussi" },
        _sum: { montant: true },
      });
      const paye = totalPaye._sum.montant ?? 0;
      const paiementStatut = paye >= dossier.fraisAgence ? "complet" : paye > 0 ? "partiel" : "aucun";
      await db.dossier.update({
        where: { id: dossier.id },
        data: {
          paiementStatut,
          // Rétrograde si le solde n'est plus complet après remboursement
          ...(dossier.etat === "PAIEMENT_CONFIRME" && paiementStatut !== "complet"
            ? { etat: "PAIEMENT_ATTENTE", etapeActuelle: 5 }
            : {}),
        },
      });
      if (statut === "rembourse") {
        await createNotification({
          userId: dossier.candidatId,
          titre: "Remboursement effectué",
          message: `Le paiement ${paiement.reference} a été remboursé.`,
          type: "paiement",
          lien: "/espace/paiement",
          dossierId: dossier.id,
        });
      } else {
        await createNotification({
          userId: dossier.candidatId,
          titre: "Paiement rejeté",
          message: `Le paiement ${paiement.reference} a été rejeté. Veuillez réessayer ou contacter l'agence.`,
          type: "alerte",
          lien: "/espace/paiement",
          dossierId: dossier.id,
        });
      }
    }
  }

  await logAudit({
    session,
    action: "UPDATE",
    resource: "paiement",
    resourceId: id,
    details: `Statut paiement → ${statut}`,
  });

  return NextResponse.json({ success: true, paiement });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role;
  const userId = (session.user as { id: string }).id;

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
