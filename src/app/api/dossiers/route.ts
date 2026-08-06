import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dossierCreateSchema, paginationQuerySchema } from "@/lib/validations";
import { checkRateLimit, getClientId } from "@/lib/rate-limit";
import { requireApiUser, parseOrRespond } from "@/lib/api-auth";
import { requirePermission } from "@/lib/rbac";
import { resolveFraisAgenceAsync } from "@/lib/dossier/frais-agence-server";
import { isProfilAcademiqueComplet } from "@/lib/dossier/pieces-requises";
import { syncPiecesDossier } from "@/lib/dossier/sync-pieces";
import { resolveActiveMatriceVersionId } from "@/lib/dossier/matrice-version";
import { getPublicProcedurePlaceholder } from "@/lib/dossier/procedure-publique";

// GET /api/dossiers — liste (candidat: ses dossiers ; staff: dossiers.read)
//
// Comportement de pagination (backward compatible) :
// - Sans `?page=`      → renvoie un tableau plat (legacy).
// - Avec `?page=N`      → renvoie { data, total, page, pageSize }.
export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { role, id: userId } = auth.user;

  if (role !== "CANDIDAT") {
    const gate = requirePermission(role, "dossiers.read");
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  // --- Params de pagination (optionnels) ---
  const { searchParams } = new URL(request.url);
  const hasPagination = searchParams.has("page");
  const query = paginationQuerySchema.parse({
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
  });
  const page = query.page;
  const pageSize = Math.min(50, query.pageSize);

  // --- Where + include partagés ---
  // Le conseiller ne voit que les dossiers qui lui sont affectés (pas ceux gérés par un
  // autre conseiller, un Admin ou un Super Admin).
  const where =
    role === "CANDIDAT"
      ? { candidatId: userId }
      : role === "CONSEILLER"
        ? { conseillerId: userId }
        : {};
  const demandesCorrectionInclude = {
    orderBy: { createdAt: "desc" as const },
    include: { conseiller: { select: { prenom: true, nom: true } } },
  };
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
          demandesCorrection: demandesCorrectionInclude,
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
          demandesCorrection: demandesCorrectionInclude,
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
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;

  const rateLimited = await checkRateLimit(getClientId(request), "/api/dossiers");
  if (rateLimited) return rateLimited;

  const { id: userId, role } = auth.user;
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

  const parsed = parseOrRespond(dossierCreateSchema, body);
  if (!parsed.ok) return parsed.response;
  const { procedure } = parsed.data;

  // Procédure Publique : le candidat ne choisit pas l'établissement — on ignore toute valeur
  // envoyée par le client et on force l'établissement placeholder (jamais confiance au front pour
  // ce choix, qui revient exclusivement au staff via l'affectation ultérieure).
  const { universiteId, formationId } =
    procedure === "PUBLIQUE"
      ? await getPublicProcedurePlaceholder()
      : { universiteId: parsed.data.universiteId!, formationId: parsed.data.formationId! };

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

  const candidat = await db.user.findUnique({
    where: { id: userId },
    select: { prenom: true, nom: true, profilAcademique: true },
  });
  if (!candidat) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  const profil = candidat.profilAcademique;
  if (!profil || !isProfilAcademiqueComplet(profil)) {
    return NextResponse.json(
      {
        error:
          "Complétez votre profil académique avant de créer un dossier (parcours lycée ou études après le bac).",
        code: "PROFIL_ACADEMIQUE_REQUIS",
      },
      { status: 400 }
    );
  }

  const year = new Date().getFullYear();
  const fraisAgence = await resolveFraisAgenceAsync(formation.universite.typeEtablissement);

  let dossier;
  try {
    dossier = await db.$transaction(async (tx) => {
    // Anti-doublon atomique (race-safe dans la transaction)
    const existing = await tx.dossier.findFirst({
      where: {
        candidatId: userId,
        formationId,
        etat: { notIn: ["REFUSE", "CLOTURE"] },
      },
      select: { id: true },
    });
    if (existing) {
      throw new Error("DOSSIER_DUPLICATE");
    }

    const countThisYear = await tx.dossier.count({
      where: { reference: { startsWith: `GETADM-${year}-` } },
    });
    const reference = `GETADM-${year}-${String(countThisYear + 1).padStart(4, "0")}`;

    const mrz = generateMrz({
      nom: candidat.nom,
      prenom: candidat.prenom,
      reference,
    });

    const matriceVersionId = await resolveActiveMatriceVersionId(tx);

    const created = await tx.dossier.create({
      data: {
        reference,
        candidatId: userId,
        universiteId,
        formationId,
        procedure,
        matriceVersionId,
        etat: "BROUILLON",
        etapeActuelle: 1,
        fraisAgence,
        paiementStatut: "aucun",
        mrz,
      },
    });

    await syncPiecesDossier(
      tx,
      created.id,
      {
        statutCandidat: profil.statutCandidat,
        classeActuelle: profil.classeActuelle,
        aObtenuBac: profil.aObtenuBac,
        trimestresSeconde: profil.trimestresSeconde,
        trimestresPremiere: profil.trimestresPremiere,
        trimestresTerminale: profil.trimestresTerminale,
        attestationScolariteDisponible: profil.attestationScolariteDisponible,
        niveauEtudesSuperieures: profil.niveauEtudesSuperieures,
        formationEnCours: profil.formationEnCours,
        diplomesObtenus: profil.diplomesObtenus,
        redoublements: profil.redoublements,
        interruptions: profil.interruptions,
      },
      { formationPiecesRequises: formation.piecesRequises },
    );

    await tx.historique.create({
      data: {
        dossierId: created.id,
        etat: "BROUILLON",
        auteur: `${candidat.prenom} ${candidat.nom}`,
        auteurId: userId,
        note:
          procedure === "PUBLIQUE"
            ? "Brouillon créé — procédure Université Publique : l'agence affectera l'établissement après étude du profil."
            : `Brouillon créé pour ${formation.intitule} — ${formation.universite.nom}`,
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
  } catch (error) {
    if (error instanceof Error && error.message === "DOSSIER_DUPLICATE") {
      return NextResponse.json(
        { error: "Vous avez déjà un dossier actif pour cette formation" },
        { status: 409 }
      );
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Conflit : dossier ou référence déjà existant. Réessayez." },
        { status: 409 }
      );
    }
    throw error;
  }

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
