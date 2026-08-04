/**
 * Wrapper fetch client pour les mutations admin (composants "use client").
 *
 * Élimine le bloc répété dans les pages admin (finance, utilisateurs, KYC,
 * attestations, catalogue, paramètres…) :
 *   try {
 *     const res = await fetch(url, {...});
 *     if (!res.ok) {
 *       const err = await res.json().catch(() => ({}));
 *       toast.error("...", { description: err.error ?? "Erreur serveur." });
 *       return;
 *     }
 *     ...
 *   } catch {
 *     toast.error("...", { description: "Erreur réseau." });
 *   }
 */

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function apiFetch<T = unknown>(
  url: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, init);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: (body as { error?: string })?.error ?? "Erreur serveur." };
    }
    return { ok: true, data: body as T };
  } catch {
    return { ok: false, error: "Erreur réseau." };
  }
}

/** Raccourci JSON pour POST/PUT/PATCH/DELETE avec un body objet. */
export function apiJson<T = unknown>(
  url: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<ApiResult<T>> {
  return apiFetch<T>(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}
