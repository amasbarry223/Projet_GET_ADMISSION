import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import {
  ACCEPTED_DOSSIER_STATES,
  PIPELINE_DOSSIER_STATES,
} from "@/shared/constants";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const gate = requirePermission((session.user as { role?: string }).role, "dashboard");
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const pipelineStates = [...PIPELINE_DOSSIER_STATES];
  const acceptedStates = [...ACCEPTED_DOSSIER_STATES];

  const [totalDossiers, dossiersEnCours, dossiersAcceptes, dossiersRefuses, paiementsMois, attestationsMois] = await Promise.all([
    db.dossier.count(),
    db.dossier.count({ where: { etat: { in: pipelineStates } } }),
    db.dossier.count({ where: { etat: { in: acceptedStates } } }),
    db.dossier.count({ where: { etat: "REFUSE" } }),
    db.paiement.aggregate({ _sum: { montant: true }, where: { date: { gte: startOfMonth }, statut: "reussi" } }),
    db.attestation.count({ where: { dateEmission: { gte: startOfMonth } } }),
  ]);

  const totalDecided = dossiersAcceptes + dossiersRefuses;
  const tauxAcceptation = totalDecided > 0 ? Math.round((dossiersAcceptes / totalDecided) * 100) : 0;

  // --- Répartition par statut ---
  const repartitionRaw = await db.dossier.groupBy({
    by: ["etat"],
    _count: true,
  });

  const STATUT_LABELS: Record<string, { name: string; couleur: string }> = {
    BROUILLON: { name: "Brouillon", couleur: "#6B7280" },
    SOUMIS: { name: "En cours", couleur: "#C77A12" },
    VERIFICATION: { name: "En cours", couleur: "#C77A12" },
    CORRECTION: { name: "En cours", couleur: "#C77A12" },
    PAIEMENT_ATTENTE: { name: "En cours", couleur: "#C77A12" },
    PAIEMENT_CONFIRME: { name: "En cours", couleur: "#C77A12" },
    TRANSMIS: { name: "En cours", couleur: "#C77A12" },
    ATTENTE_REPONSE: { name: "En cours", couleur: "#C77A12" },
    PRE_ADMISSION: { name: "Validés", couleur: "#3CA936" },
    ATTESTATION: { name: "Validés", couleur: "#3CA936" },
    CLOTURE: { name: "Validés", couleur: "#3CA936" },
    REFUSE: { name: "Refusés", couleur: "#C0392B" },
  };

  const repartitionMap = new Map<string, number>();
  for (const r of repartitionRaw) {
    const cat = STATUT_LABELS[r.etat]?.name ?? "Autre";
    repartitionMap.set(cat, (repartitionMap.get(cat) ?? 0) + r._count);
  }

  const repartitionStatuts = Array.from(repartitionMap.entries()).map(([name, value]) => ({
    name,
    value,
    couleur: name === "Brouillon" ? "#6B7280" : name === "En cours" ? "#C77A12" : name === "Validés" ? "#3CA936" : "#C0392B",
  }));

  // --- Top universités ---
  const topUnivsRaw = await db.dossier.groupBy({
    by: ["universiteId"],
    _count: true,
    orderBy: { _count: { universiteId: "desc" } },
    take: 8,
  });

  // FIX (N+1) : un seul findMany + Map lookup au lieu d'un findUnique par université.
  const univIds = topUnivsRaw.map((u) => u.universiteId);
  const univs = await db.universite.findMany({
    where: { id: { in: univIds } },
    select: { id: true, nom: true },
  });
  const univMap = new Map(univs.map((u) => [u.id, u.nom]));
  const topUniversites = topUnivsRaw.map((u) => ({
    universite: univMap.get(u.universiteId) ?? "—",
    dossiers: u._count,
  }));

  // --- Dossiers par période (6 dernières semaines) ---
  const sixWeeksAgo = new Date(now);
  sixWeeksAgo.setDate(sixWeeksAgo.getDate() - 42);
  const dossiersPeriode = await db.dossier.findMany({
    where: { createdAt: { gte: sixWeeksAgo } },
    select: { createdAt: true, etat: true },
    orderBy: { createdAt: "asc" },
  });

  // Group by week
  const weeks: { periode: string; dossiers: number; acceptes: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekDossiers = dossiersPeriode.filter((d) => d.createdAt >= weekStart && d.createdAt < weekEnd);
    weeks.push({
      periode: `S${6 - i}`,
      dossiers: weekDossiers.length,
      acceptes: weekDossiers.filter((d) => ["PRE_ADMISSION", "ATTESTATION", "CLOTURE"].includes(d.etat)).length,
    });
  }

  // --- Encaissements par mois (6 derniers) ---
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const paiements = await db.paiement.findMany({
    where: { date: { gte: sixMonthsAgo }, statut: "reussi" },
    select: { date: true, montant: true },
  });

  const MOIS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
  const moisMap = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
    moisMap.set(MOIS[m.getMonth()], 0);
  }
  for (const p of paiements) {
    const key = MOIS[p.date.getMonth()];
    if (moisMap.has(key)) {
      moisMap.set(key, moisMap.get(key)! + p.montant);
    }
  }
  const transactionsParMois = Array.from(moisMap.entries()).map(([mois, montant]) => ({ mois, montant }));

  // --- File prioritaire ---
  const filePrioritaire = await db.dossier.findMany({
    where: { etat: { in: ["CORRECTION", "PAIEMENT_ATTENTE", "SOUMIS", "VERIFICATION"] } },
    include: {
      candidat: { select: { prenom: true, nom: true } },
      universite: { select: { nom: true } },
      formation: { select: { intitule: true } },
    },
    take: 5,
    orderBy: { updatedAt: "asc" },
  });

  // --- Dossiers récents ---
  const dossiersRecents = await db.dossier.findMany({
    include: {
      candidat: { select: { prenom: true, nom: true } },
      universite: { select: { nom: true } },
      formation: { select: { intitule: true } },
      conseiller: { select: { prenom: true, nom: true } },
    },
    take: 5,
    orderBy: { updatedAt: "desc" },
  });

  // --- Top conseillers ---
  const conseillers = await db.user.findMany({
    where: { role: "CONSEILLER", actif: true },
    select: {
      id: true, prenom: true, nom: true,
      _count: { select: { dossiersConseiller: true } },
    },
  });

  // FIX (N+1) : un seul groupBy pour les acceptés au lieu d'un count par conseiller.
  const conseillerIds = conseillers.map((c) => c.id);
  const acceptesByConseiller = await db.dossier.groupBy({
    by: ["conseillerId"],
    where: {
      conseillerId: { in: conseillerIds },
      etat: { in: ["PRE_ADMISSION", "ATTESTATION", "CLOTURE"] },
    },
    _count: true,
  });
  const acceptesMap = new Map(acceptesByConseiller.map((a) => [a.conseillerId, a._count]));
  const topConseillers = conseillers.map((c) => ({
    id: c.id,
    nom: `${c.prenom} ${c.nom}`,
    initiales: `${c.prenom[0] ?? ""}${c.nom[0] ?? ""}`,
    dossiers: c._count.dossiersConseiller,
    acceptes: acceptesMap.get(c.id) ?? 0,
    avatar: "/images/advisor-portrait.png",
  }));

  // --- Finance KPIs ---
  const totalEncaisse = await db.paiement.aggregate({ _sum: { montant: true }, where: { statut: "reussi" } });
  const enAttente = await db.paiement.aggregate({ _sum: { montant: true }, where: { statut: "en_attente" } });
  const impayes = await db.paiement.aggregate({ _sum: { montant: true }, where: { statut: "echoue" } });

  // --- Deltas vs mois précédent (calculés, non hardcodés) ---
  const startPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [
    dossiersCeMois,
    dossiersMoisPrec,
    enCoursCeMois,
    enCoursMoisPrec,
    acceptesCeMois,
    acceptesMoisPrec,
    refusesCeMois,
    refusesMoisPrec,
    paiementsMoisPrec,
    attestationsMoisPrec,
  ] = await Promise.all([
    db.dossier.count({ where: { createdAt: { gte: startOfMonth } } }),
    db.dossier.count({ where: { createdAt: { gte: startPrevMonth, lte: endPrevMonth } } }),
    db.dossier.count({
      where: {
        etat: { in: pipelineStates },
        updatedAt: { gte: startOfMonth },
      },
    }),
    db.dossier.count({
      where: {
        etat: { in: pipelineStates },
        updatedAt: { gte: startPrevMonth, lte: endPrevMonth },
      },
    }),
    db.dossier.count({
      where: { etat: { in: acceptedStates }, updatedAt: { gte: startOfMonth } },
    }),
    db.dossier.count({
      where: { etat: { in: acceptedStates }, updatedAt: { gte: startPrevMonth, lte: endPrevMonth } },
    }),
    db.dossier.count({ where: { etat: "REFUSE", updatedAt: { gte: startOfMonth } } }),
    db.dossier.count({ where: { etat: "REFUSE", updatedAt: { gte: startPrevMonth, lte: endPrevMonth } } }),
    db.paiement.aggregate({
      _sum: { montant: true },
      where: { date: { gte: startPrevMonth, lte: endPrevMonth }, statut: "reussi" },
    }),
    db.attestation.count({ where: { dateEmission: { gte: startPrevMonth, lte: endPrevMonth } } }),
  ]);

  const pctDelta = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const decidedCeMois = acceptesCeMois + refusesCeMois;
  const decidedPrec = acceptesMoisPrec + refusesMoisPrec;
  const tauxCeMois = decidedCeMois > 0 ? Math.round((acceptesCeMois / decidedCeMois) * 100) : 0;
  const tauxPrec = decidedPrec > 0 ? Math.round((acceptesMoisPrec / decidedPrec) * 100) : 0;

  return NextResponse.json({
    kpis: {
      nouveauxDossiers: totalDossiers,
      enCours: dossiersEnCours,
      tauxAcceptation,
      encaissementsMois: paiementsMois._sum.montant ?? 0,
      attestationsEmises: attestationsMois,
      deltaNouveaux: pctDelta(dossiersCeMois, dossiersMoisPrec),
      deltaEnCours: pctDelta(enCoursCeMois, enCoursMoisPrec),
      deltaAcceptation: tauxCeMois - tauxPrec,
      deltaEncaissements: pctDelta(paiementsMois._sum.montant ?? 0, paiementsMoisPrec._sum.montant ?? 0),
      deltaAttestations: pctDelta(attestationsMois, attestationsMoisPrec),
    },
    financeKpis: {
      encaisseMois: paiementsMois._sum.montant ?? 0,
      enAttente: enAttente._sum.montant ?? 0,
      impayes: impayes._sum.montant ?? 0,
      totalEncaisse: totalEncaisse._sum.montant ?? 0,
    },
    repartitionStatuts,
    topUniversites,
    dossiersParPeriode: weeks,
    transactionsParMois,
    topConseillers,
    filePrioritaire: filePrioritaire.map((d) => ({
      id: d.id,
      reference: d.reference,
      etat: d.etat,
      candidatPrenom: d.candidat.prenom,
      candidatNom: d.candidat.nom,
      universiteNom: d.universite.nom,
      formationIntitule: d.formation.intitule,
    })),
    dossiersRecents: dossiersRecents.map((d) => ({
      id: d.id,
      reference: d.reference,
      etat: d.etat,
      etapeActuelle: d.etapeActuelle,
      fraisAgence: d.fraisAgence,
      dateMaj: d.updatedAt.toISOString(),
      candidatPrenom: d.candidat.prenom,
      candidatNom: d.candidat.nom,
      universiteNom: d.universite.nom,
      conseillerNom: d.conseiller ? `${d.conseiller.prenom} ${d.conseiller.nom}` : "Non affecté",
    })),
  });
}
