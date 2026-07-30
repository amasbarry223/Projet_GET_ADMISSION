import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { dossierCreateSchema, validate } from "@/lib/validations";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";
import { parseJsonArray } from "@/lib/types";

// GET /api/dossiers — liste (candidat: ses dossiers ; staff: tous)
//
// Comportement de pagination (backward compatible) :
// - Sans `?page=`      → renvoie un tableau plat (legacy).
// - Avec `?page=N`      → renvoie { data, total, page, pageSize }.
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  // --- Params de pagination (optionnels) ---
  const { searchParams } = new URL(request.url);
  const hasPagination = searchParams.has("page");
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? "20")));

  // --- Where + include partagés ---
  const where = role === "CANDIDAT" ? { candidatId: userId } : {};
  const include =
    role === "CANDIDAT"
      ? {
          candidat: { select: { prenom: true, nom: true, email: true, nationalite: true, telephone: true } },
          universite: true,
          formation: true,
          conseiller: { select: { prenom: true, nom: true } },
          pieces: true,
          paiements: true,
          historiques: { orderBy: { date: "asc" as const } },
        }
      : {
          candidat: { select: { prenom: true, nom: true, email: true, nationalite: true } },
          universite: true,
          formation: true,
          conseiller: { select: { prenom: true, nom: true } },
          pieces: true,
          paiements: true,
          historiques: { orderBy: { date: "asc" as const } },
        };

  if (hasPagination) {
    const [dossiers, total] = await Promise.all([
      db.dossier.findMany({
        where,
        include,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { updatedAt: "desc" },
      }),
      db.dossier.count({ where }),
    ]);
    return NextResponse.json({ data: dossiers, total, page, pageSize });
  }

  // Legacy flat array (no pagination requested)
  const dossiers = await db.dossier.findMany({
    where,
    include,
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(dossiers);
}

// ===================== Helpers =====================

/**
 * Génère un MRZ (Machine Readable Zone) simplifié sur 2 lignes de 44 caractères.
 * Format inspiré du TD1 (pièce d'identité), adapté au contexte GET Admission.
 */
function generateMrz(opts: { nom: string; prenom: string; reference: string }): string {
  const sanitize = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "<")
      .replace(/<+/g, "<");

  const nom = sanitize(opts.nom).slice(0, 30).padEnd(30, "<");
  const prenom = sanitize(opts.prenom).slice(0, 27).padEnd(27, "<");
  const ref = sanitize(opts.reference).replace(/-/g, "").slice(0, 12).padEnd(12, "<");

  const line1 = `P<GETADM${nom}<<${prenom}`.slice(0, 44).padEnd(44, "<");
  const line2 = `${ref}<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<`.slice(0, 44).padEnd(44, "<");

  return `${line1}\n${line2}`;
}

// POST /api/dossiers — créer un dossier (candidat uniquement)
//
// Body: { universiteId, formationId }
// - Génère la référence : GETADM-YYYY-NNNN
// - Génère le MRZ basé sur le nom du candidat
// - État initial : SOUMIS, étape 2
// - Crée : dossier + pieces (depuis formation.piecesRequises)
//          + historique (SOUMIS) + conversation
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  // Rate limiting (10 dossiers / min / IP)
  const rateLimited = checkRateLimit(getClientId(request), "/api/dossiers");
  if (rateLimited) return rateLimited;

  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  if (role !== "CANDIDAT") {
    return NextResponse.json(
      { error: "Seuls les candidats peuvent créer un dossier" },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = validate(dossierCreateSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { universiteId, formationId } = parsed.data;

  // Vérifier que la formation appartient bien à l'université
  const formation = await db.formation.findUnique({
    where: { id: formationId },
    include: { universite: true },
  });
  if (!formation || formation.universiteId !== universiteId) {
    return NextResponse.json(
      { error: "Formation introuvable pour cette université" },
      { status: 404 }
    );
  }

  // Vérifier que le candidat n'a pas déjà un dossier actif pour cette formation
  const existing = await db.dossier.findFirst({
    where: {
      candidatId: userId,
      formationId,
      etat: { notIn: ["REFUSE", "CLOTURE"] },
    },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Vous avez déjà un dossier actif pour cette formation" },
      { status: 409 }
    );
  }

  // Récupérer le candidat pour le MRZ
  const candidat = await db.user.findUnique({
    where: { id: userId },
    select: { prenom: true, nom: true },
  });
  if (!candidat) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  // Générer la référence : GETADM-YYYY-NNNN (incrémental sur l'année)
  const year = new Date().getFullYear();
  const countThisYear = await db.dossier.count({
    where: { reference: { startsWith: `GETADM-${year}-` } },
  });
  const reference = `GETADM-${year}-${String(countThisYear + 1).padStart(4, "0")}`;

  // Générer le MRZ
  const mrz = generateMrz({
    nom: candidat.nom,
    prenom: candidat.prenom,
    reference,
  });

  // Récupérer les pièces requises depuis la formation
  const piecesRequises = parseJsonArray(formation.piecesRequises);

  // Créer le dossier + pièces + historique + conversation en transaction
  const dossier = await db.$transaction(async (tx) => {
    const created = await tx.dossier.create({
      data: {
        reference,
        candidatId: userId,
        universiteId,
        formationId,
        etat: "SOUMIS",
        etapeActuelle: 2,
        fraisAgence: formation.fraisAgence,
        paiementStatut: "aucun",
        mrz,
      },
    });

    // Créer les pièces requises (statut "manquante" par défaut)
    if (piecesRequises.length > 0) {
      await tx.piece.createMany({
        data: piecesRequises.map((libelle) => ({
          dossierId: created.id,
          libelle,
          statut: "manquante",
          type: "pdf",
        })),
      });
    }

    // Historique initial
    await tx.historique.create({
      data: {
        dossierId: created.id,
        etat: "SOUMIS",
        auteur: `${candidat.prenom} ${candidat.nom}`,
        auteurId: userId,
        note: `Dossier soumis pour ${formation.intitule} — ${formation.universite.nom}`,
      },
    });

    // Conversation initiale (sans conseiller affecté)
    await tx.conversation.create({
      data: {
        dossierId: created.id,
        candidatId: userId,
        conseillerId: null,
      },
    });

    return created;
  });

  // Recharger avec relations pour la réponse
  const result = await db.dossier.findUnique({
    where: { id: dossier.id },
    include: {
      universite: true,
      formation: true,
      pieces: true,
      historiques: { orderBy: { date: "asc" } },
    },
  });

  return NextResponse.json(result, { status: 201 });
}
