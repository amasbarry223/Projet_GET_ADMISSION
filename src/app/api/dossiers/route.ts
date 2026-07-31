import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { dossierCreateSchema, validate } from "@/lib/validations";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";
import { parseJsonArray } from "@/lib/types";
import { requirePermission } from "@/lib/rbac";

// GET /api/dossiers — liste (candidat: ses dossiers ; staff: dossiers.read)
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

  if (role !== "CANDIDAT") {
    const gate = requirePermission(role, "dossiers.read");
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

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
          conseiller: { select: { prenom: true, nom: true, photoUrl: true } },
          pieces: true,
          paiements: true,
          historiques: { orderBy: { date: "asc" as const } },
          conversation: { select: { nonLusCandidat: true } },
        }
      : {
          candidat: { select: { prenom: true, nom: true, email: true, nationalite: true } },
          universite: true,
          formation: true,
          conseiller: { select: { prenom: true, nom: true, photoUrl: true } },
          pieces: true,
          paiements: true,
          historiques: { orderBy: { date: "asc" as const } },
          conversation: { select: { nonLusCandidat: true } },
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

// POST /api/dossiers — créer un dossier brouillon (candidat uniquement)
//
// Body: { universiteId, formationId }
// - État initial : BROUILLON, étape 1 (BF-12)
// - Soumission explicite via PUT action=soumettre (BF-15)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

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

  const candidat = await db.user.findUnique({
    where: { id: userId },
    select: { prenom: true, nom: true },
  });
  if (!candidat) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  const year = new Date().getFullYear();
  const countThisYear = await db.dossier.count({
    where: { reference: { startsWith: `GETADM-${year}-` } },
  });
  const reference = `GETADM-${year}-${String(countThisYear + 1).padStart(4, "0")}`;

  const mrz = generateMrz({
    nom: candidat.nom,
    prenom: candidat.prenom,
    reference,
  });

  const piecesRequises = parseJsonArray(formation.piecesRequises);
  const identityPieces = ["Passeport ou CNI (page photo)", "Photo d'identité récente"];
  const allLibelles = [...new Set([...piecesRequises, ...identityPieces])];

  const dossier = await db.$transaction(async (tx) => {
    const created = await tx.dossier.create({
      data: {
        reference,
        candidatId: userId,
        universiteId,
        formationId,
        etat: "BROUILLON",
        etapeActuelle: 1,
        fraisAgence: formation.fraisAgence,
        paiementStatut: "aucun",
        mrz,
      },
    });

    if (allLibelles.length > 0) {
      await tx.piece.createMany({
        data: allLibelles.map((libelle) => ({
          dossierId: created.id,
          libelle,
          statut: "manquante",
          type: "pdf",
        })),
      });
    }

    await tx.historique.create({
      data: {
        dossierId: created.id,
        etat: "BROUILLON",
        auteur: `${candidat.prenom} ${candidat.nom}`,
        auteurId: userId,
        note: `Brouillon créé pour ${formation.intitule} — ${formation.universite.nom}`,
      },
    });

    await tx.conversation.create({
      data: {
        dossierId: created.id,
        candidatId: userId,
        conseillerId: null,
      },
    });

    return created;
  });

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
