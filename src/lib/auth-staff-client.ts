"use client";

const STAFF_BASE = "/api/auth/staff";

async function staffCsrfToken(): Promise<string> {
  const res = await fetch(`${STAFF_BASE}/csrf`);
  const data = (await res.json()) as { csrfToken?: string };
  return data.csrfToken ?? "";
}

type StaffSignInResult = { error: string | null; status: number; ok: boolean; url: string | null };

/**
 * Remplace signIn("credentials", ...) de next-auth/react pour le portail staff.
 *
 * next-auth/react garde un unique `__NEXTAUTH.basePath` au niveau module, partagé par TOUS les
 * SessionProvider montés sur la page. Or /back-office et /admin imbriquent un
 * StaffSessionProvider (basePath /api/auth/staff) À L'INTÉRIEUR du SessionProvider candidat
 * racine (basePath /api/auth/candidat, monté pour toute l'app dans le layout racine) : les deux
 * se disputent cette valeur partagée. Le moindre re-render du provider candidat (poll de session,
 * focus fenêtre…) après le montage du provider staff la réécrase, et signIn()/signOut() côté staff
 * peuvent alors silencieusement cibler /api/auth/candidat/... au lieu de /api/auth/staff/...
 * — d'où des 401 aléatoires sur le login staff, non systématiques (dépend du timing des re-renders).
 * On poste donc directement vers l'endpoint staff, sans passer par le client partagé.
 */
export async function staffSignIn(
  credentials: Record<string, string>,
): Promise<StaffSignInResult> {
  const csrfToken = await staffCsrfToken();
  const res = await fetch(`${STAFF_BASE}/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      ...credentials,
      csrfToken,
      callbackUrl: window.location.href,
      json: "true",
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { url?: string };
  const url = data.url ?? null;
  let error: string | null = null;
  if (url) {
    try {
      error = new URL(url).searchParams.get("error");
    } catch {
      /* ignore */
    }
  }
  return { error, status: res.status, ok: res.ok, url };
}

export async function staffSignOut(options?: { callbackUrl?: string; redirect?: boolean }): Promise<void> {
  const csrfToken = await staffCsrfToken();
  const res = await fetch(`${STAFF_BASE}/signout`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      csrfToken,
      callbackUrl: options?.callbackUrl ?? window.location.href,
      json: "true",
    }),
  });
  if (options?.redirect === false) return;
  const data = (await res.json().catch(() => ({}))) as { url?: string };
  window.location.href = data.url ?? options?.callbackUrl ?? window.location.href;
}
