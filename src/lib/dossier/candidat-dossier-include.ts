/** Include Prisma partagé — liste / live SSE espace candidat. */
export const CANDIDAT_DOSSIER_INCLUDE = {
  candidat: {
    select: {
      prenom: true,
      nom: true,
      email: true,
      nationalite: true,
      telephone: true,
    },
  },
  universite: true,
  formation: true,
  conseiller: { select: { prenom: true, nom: true, photoUrl: true } },
  pieces: true,
  paiements: true,
  historiques: { orderBy: { date: "asc" as const } },
  conversation: { select: { nonLusCandidat: true } },
} as const;

/** Empreinte légère pour détecter un changement sans sérialiser tout le graphe. */
export function dossierLiveFingerprint(d: {
  id: string;
  etat: string;
  updatedAt: Date | string;
  paiementStatut: string;
  etapeActuelle: number;
  pieces: { id: string; statut: string }[];
  historiques: { id: string }[];
  paiements: { id: string; statut: string }[];
  conversation: { nonLusCandidat: number } | null;
}): string {
  const piecesSig = d.pieces.map((p) => `${p.id}:${p.statut}`).join(",");
  const paySig = d.paiements.map((p) => `${p.id}:${p.statut}`).join(",");
  const updated =
    d.updatedAt instanceof Date ? d.updatedAt.toISOString() : String(d.updatedAt);
  return [
    d.id,
    d.etat,
    d.etapeActuelle,
    d.paiementStatut,
    updated,
    d.historiques.length,
    piecesSig,
    paySig,
    d.conversation?.nonLusCandidat ?? 0,
  ].join("|");
}
