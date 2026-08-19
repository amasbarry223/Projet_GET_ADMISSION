"use client";

import * as React from "react";
import { toast } from "sonner";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  DOSSIER_LIVE_CHANNEL,
  type DossierLiveBroadcastPayload,
} from "@/lib/dossier/live-broadcast";
import { pickPrimaryDossier } from "@/lib/dossier/pick-dossier";
import { etatParCode } from "@/lib/etats";
import { DOSSIERS_QUERY_KEY } from "@/hooks/use-primary-dossier";
import { useQueryClient } from "@tanstack/react-query";

export type DossierLive = {
  id: string;
  reference: string;
  etat: string;
  etapeActuelle: number;
  fraisAgence: number;
  mrz: string;
  updatedAt: string;
  paiementStatut?: string | null;
  candidat: { prenom: string; nom: string; nationalite: string };
  universite: {
    nom: string;
    pays: string;
    drapeau: string;
    ville: string;
    slug: string;
    coverUrl?: string | null;
    estPlaceholder?: boolean;
  };
  formation: { intitule: string; niveau: string; domaine: string };
  conseiller: { prenom: string; nom: string; photoUrl?: string | null } | null;
  pieces: { id: string; libelle: string; statut: string }[];
  paiements: {
    id: string;
    reference: string;
    date: string;
    montant: number;
    moyen: string;
    statut: string;
  }[];
  historiques: { id: string; date: string; etat: string; auteur: string; note: string }[];
  conversation: { nonLusCandidat: number } | null;
  demandesCorrection: {
    id: string;
    motif: string;
    statut: string;
    createdAt: string;
    soumiseLe: string | null;
    traiteeLe: string | null;
    conseiller: { prenom: string; nom: string };
  }[];
};

export type LiveStatus = "connecting" | "live" | "polling" | "offline";

type Options = {
  dossierId?: string | null;
  pollMs?: number;
};

function resolvePreferred(
  list: DossierLive[],
  preferredId?: string | null,
): DossierLive | null {
  if (preferredId) {
    const hit = list.find((d) => d.id === preferredId);
    if (hit) return hit;
  }
  return pickPrimaryDossier(list) ?? null;
}

async function fetchDossiersList(): Promise<DossierLive[]> {
  const res = await fetch("/api/dossiers", { cache: "no-store" });
  if (!res.ok) throw new Error("fetch");
  const data = (await res.json()) as DossierLive[] | { data: DossierLive[] };
  return Array.isArray(data) ? data : Array.isArray(data.data) ? data.data : [];
}

export function useDossierLive(options: Options = {}) {
  const { dossierId = null, pollMs = 12_000 } = options;
  const queryClient = useQueryClient();
  const [allDossiers, setAllDossiers] = React.useState<DossierLive[]>([]);
  const [dossier, setDossier] = React.useState<DossierLive | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [liveStatus, setLiveStatus] = React.useState<LiveStatus>("connecting");
  const [lastSyncedAt, setLastSyncedAt] = React.useState<Date | null>(null);

  const etatRef = React.useRef<string | null>(null);
  const dossierIdRef = React.useRef<string | null>(null);
  const silentRef = React.useRef(true);

  const applyDossier = React.useCallback((next: DossierLive | null) => {
    setDossier(next);
    setLastSyncedAt(new Date());
    setError(null);

    if (!next) {
      etatRef.current = null;
      dossierIdRef.current = null;
      return;
    }

    dossierIdRef.current = next.id;
    const prevEtat = etatRef.current;
    if (!silentRef.current && prevEtat && prevEtat !== next.etat) {
      const info = etatParCode(next.etat);
      toast.message(`Étape ${info.ordre}/12 — ${info.libelle}`, {
        description: info.description,
        duration: 5500,
      });
    }
    etatRef.current = next.etat;
  }, []);

  const refresh = React.useCallback(async () => {
    try {
      const list = await fetchDossiersList();
      setAllDossiers(list);
      queryClient.setQueryData(DOSSIERS_QUERY_KEY, list);
      applyDossier(resolvePreferred(list, dossierId));
      return true;
    } catch {
      setError("Impossible de charger votre dossier.");
      setLiveStatus((s) => (s === "live" ? s : "offline"));
      return false;
    } finally {
      setLoading(false);
      silentRef.current = false;
    }
  }, [applyDossier, dossierId, queryClient]);

  React.useEffect(() => {
    let cancelled = false;
    let es: EventSource | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let supabase: ReturnType<typeof createSupabaseBrowserClient> | null = null;
    let channel: RealtimeChannel | null = null;

    const startPolling = () => {
      if (cancelled || pollTimer) return;
      setLiveStatus("polling");
      pollTimer = setInterval(() => {
        if (document.visibilityState === "visible") void refresh();
      }, pollMs);
    };

    const stopPolling = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    const onFocus = () => void refresh();
    const onVis = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);

    void (async () => {
      await refresh();
      if (cancelled) return;

      const qs = dossierId ? `?dossierId=${encodeURIComponent(dossierId)}` : "";
      try {
        es = new EventSource(`/api/dossiers/live${qs}`);
        es.addEventListener("dossier", (ev) => {
          try {
            const payload = JSON.parse((ev as MessageEvent).data) as {
              dossier: DossierLive | null;
            };
            applyDossier(payload.dossier);
            setLoading(false);
            setLiveStatus("live");
            stopPolling();
          } catch {
            /* ignore */
          }
        });
        es.addEventListener("ping", () => setLiveStatus("live"));
        es.onerror = () => {
          es?.close();
          es = null;
          if (!cancelled) startPolling();
        };
      } catch {
        startPolling();
      }

      try {
        supabase = createSupabaseBrowserClient();
        channel = supabase
          .channel(DOSSIER_LIVE_CHANNEL)
          .on("broadcast", { event: "dossier_updated" }, (msg) => {
            const p = (msg as { payload?: DossierLiveBroadcastPayload }).payload;
            if (!p?.dossierId) return;
            const currentId = dossierIdRef.current;
            if (dossierId && p.dossierId !== dossierId) return;
            if (currentId && p.dossierId !== currentId) return;
            void refresh();
          })
          .subscribe();
      } catch {
        /* broadcast optionnel */
      }
    })();

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
      es?.close();
      stopPolling();
      if (supabase && channel) void supabase.removeChannel(channel);
    };
  }, [dossierId, pollMs, refresh, applyDossier]);

  return {
    dossier,
    allDossiers,
    loading,
    error,
    liveStatus,
    lastSyncedAt,
    refresh,
  };
}
