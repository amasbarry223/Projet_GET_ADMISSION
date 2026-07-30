import type { Prisma } from "@prisma/client";

// ===================== Types Prisma dérivés =====================
// Évite la duplication des types Dossier/Row dans 8+ fichiers.

// Dossier avec toutes ses relations (pour espace candidat + admin détail)
export type DossierWithRelations = Prisma.DossierGetPayload<{
  include: {
    candidat: { select: { id: true; prenom: true; nom: true; email: true; nationalite: true; telephone: true } };
    universite: true;
    formation: true;
    conseiller: { select: { id: true; prenom: true; nom: true } } | null;
    pieces: true;
    paiements: true;
    historiques: { orderBy: { date: "asc" } };
    conversation: {
      include: {
        messages: {
          include: { auteur: { select: { prenom: true; nom: true; role: true } } };
          orderBy: { createdAt: "asc" };
        };
      };
    } | null;
  };
}>;

// Dossier simplifié (pour listes DataTable)
export type DossierListItem = Prisma.DossierGetPayload<{
  include: {
    candidat: { select: { prenom: true; nom: true; email: true; nationalite: true } };
    universite: { select: { nom: true; slug: true; pays: true; drapeau: true; ville: true } };
    formation: { select: { intitule: true; niveau: true; domaine: true } };
    conseiller: { select: { prenom: true; nom: true } } | null;
    _count: { select: { pieces: true; paiements: true } };
  };
}>;

// Transaction (pour /api/admin/transactions)
export type TransactionRow = Prisma.PaiementGetPayload<{
  include: {
    candidat: { select: { prenom: true; nom: true } };
    dossier: { select: { reference: true } };
  };
}>;

// User (pour /api/admin/users)
export type UserRow = Prisma.UserGetPayload<{
  select: {
    id: true;
    email: true;
    prenom: true;
    nom: true;
    role: true;
    actif: true;
    createdAt: true;
    _count: { select: { dossiersConseiller: true } };
  };
}>;

// Universite avec formations (pour catalogue + détail)
export type UniversiteWithFormations = Prisma.UniversiteGetPayload<{
  include: { formations: true };
}>;

// ===================== Helpers de transformation =====================

/** Parse un champ JSON stocké en string (SQLite limitation). */
export function parseJsonArray(field: string | null | undefined): string[] {
  if (!field) return [];
  try {
    const parsed = JSON.parse(field);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Transforme une Universite DB (JSON strings) en objet avec arrays parsés. */
export function normalizeUniversite(u: UniversiteWithFormations) {
  return {
    ...u,
    domaines: parseJsonArray(u.domaines),
    pointsForts: parseJsonArray(u.pointsForts),
    formations: u.formations.map((f) => ({
      ...f,
      prerequis: parseJsonArray(f.prerequis),
      piecesRequises: parseJsonArray(f.piecesRequises),
    })),
    partenaire: u.partenaire,
  };
}

/** Sérialise un dossier pour la réponse API (dates → ISO strings). */
export function serializeDossier(d: DossierWithRelations) {
  return {
    ...d,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
    pieces: d.pieces.map((p) => ({
      ...p,
      televerseeLe: p.televerseeLe?.toISOString() ?? null,
    })),
    paiements: d.paiements.map((p) => ({
      ...p,
      date: p.date.toISOString(),
    })),
    historiques: d.historiques.map((h) => ({
      ...h,
      date: h.date.toISOString(),
    })),
    conversation: d.conversation
      ? {
          ...d.conversation,
          messages: d.conversation.messages.map((m) => ({
            ...m,
            createdAt: m.createdAt.toISOString(),
          })),
        }
      : null,
  };
}
