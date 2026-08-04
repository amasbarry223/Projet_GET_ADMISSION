"use client";

import { useQuery } from "@tanstack/react-query";
import { pickPrimaryDossier } from "@/lib/dossier/pick-dossier";
import { API_ROUTES } from "@/shared/constants";

export const DOSSIERS_QUERY_KEY = ["dossiers"] as const;

export type EspaceDossierSummary = {
  id: string;
  reference?: string;
  etat: string;
  updatedAt: string;
  fraisAgence?: number;
  paiementStatut?: string | null;
  mrz?: string;
  candidat?: { prenom: string; nom: string };
  universite?: { nom: string; ville?: string; pays?: string };
  formation?: { intitule: string; niveau?: string };
  conseiller?: { prenom: string; nom: string; photoUrl?: string | null } | null;
  conversation?: { nonLusCandidat?: number } | null;
  paiements?: {
    id: string;
    reference: string;
    date: string;
    montant: number;
    moyen: string;
    statut: string;
    tranche?: string | null;
  }[];
  historiques?: { id: string; date: string; etat: string; auteur: string; note: string }[];
  pieces?: { id: string; libelle: string; statut: string; categorie?: string; code?: string }[];
};

async function fetchDossiersList(): Promise<EspaceDossierSummary[]> {
  const res = await fetch(API_ROUTES.DOSSIERS, { cache: "no-store" });
  if (!res.ok) throw new Error("Impossible de charger vos dossiers.");
  const data = (await res.json()) as EspaceDossierSummary[] | { data: EspaceDossierSummary[] };
  return Array.isArray(data) ? data : Array.isArray(data.data) ? data.data : [];
}

export function useDossiersQuery(options?: { refetchInterval?: number | false }) {
  return useQuery({
    queryKey: DOSSIERS_QUERY_KEY,
    queryFn: fetchDossiersList,
    staleTime: 15_000,
    refetchInterval: options?.refetchInterval,
  });
}

export function usePrimaryDossier(preferredId?: string | null) {
  const query = useDossiersQuery();
  const dossier = pickPrimaryDossier(query.data ?? [], preferredId) ?? null;
  return {
    dossier,
    dossiers: query.data ?? [],
    loading: query.isLoading,
    error: query.error
      ? query.error instanceof Error
        ? query.error.message
        : "Impossible de charger votre dossier."
      : null,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
}
