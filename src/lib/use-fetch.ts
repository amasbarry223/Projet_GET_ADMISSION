"use client";

import * as React from "react";

type State<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

/**
 * Hook utilitaire pour les appels API GET côté client.
 * Élimine la duplication du pattern fetch + useState + useEffect + loading + error.
 *
 * @example
 * const { data, loading, error } = useFetch<Dossier[]>("/api/dossiers");
 */
export function useFetch<T>(url: string | null, options?: { deps?: unknown[] }): State<T> {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(!!url);
  const [error, setError] = React.useState<string | null>(null);
  const [nonce, setNonce] = React.useState(0);

  React.useEffect(() => {
    if (!url) {
      setData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: T) => {
        if (!cancelled) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Une erreur est survenue.");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [url, nonce]);

  return { data, loading, error, refetch: () => setNonce((n) => n + 1) };
}
