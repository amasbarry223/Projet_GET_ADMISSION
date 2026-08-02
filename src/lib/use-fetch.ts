"use client";

import * as React from "react";
import { getApiErrorMessage, getApiErrorMessageSync, messageFromBody } from "@/lib/api-error";
import { runAsyncEffect } from "@/lib/run-async-effect";

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
  const depsKey = JSON.stringify(options?.deps ?? []);

  React.useEffect(() => {
    if (!url) {
      return runAsyncEffect(() => {
        setData(null);
        setLoading(false);
        setError(null);
      });
    }

    let cancelled = false;
    const cancelSchedule = runAsyncEffect(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);

      fetch(url)
        .then(async (r) => {
          if (!r.ok) {
            const msg = await getApiErrorMessage(r);
            throw new Error(msg);
          }
          return r.json() as Promise<T>;
        })
        .then((d) => {
          if (!cancelled) {
            setData(d);
            setLoading(false);
          }
        })
        .catch((e) => {
          if (!cancelled) {
            setError(
              e instanceof Error
                ? getApiErrorMessageSync(e)
                : "Une erreur est survenue. Réessayez.",
            );
            setLoading(false);
          }
        });
    });

    return () => {
      cancelled = true;
      cancelSchedule();
    };
  }, [url, nonce, depsKey]);

  return { data, loading: url ? loading : false, error: url ? error : null, refetch: () => setNonce((n) => n + 1) };
}

/** Helper pour mutations : lit l'erreur API et la renvoie en string. */
export async function readFetchError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return messageFromBody(body) ?? getApiErrorMessageSync(res.status, body);
  } catch {
    return getApiErrorMessageSync(res.status);
  }
}
