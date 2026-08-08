/**
 * Noms des cookies de session NextAuth par portail — module volontairement sans dépendance
 * (pas de Prisma, bcrypt, crypto Node...) car importé à la fois par src/lib/auth.ts (Node) et
 * src/middleware.ts (Edge Runtime, qui n'autorise pas les modules Node natifs).
 *
 * Deux portails (candidat / staff) = deux cookies de session distincts, pour que le même
 * navigateur puisse porter les deux identités en parallèle (un onglet par portail) sans que
 * la seconde connexion écrase silencieusement la session de la première.
 */
export type Portal = "staff" | "candidat";

const isProduction = process.env.NODE_ENV === "production";

export function buildCookieNames(portal: Portal) {
  return {
    sessionToken: isProduction
      ? `__Secure-next-auth.${portal}-session-token`
      : `next-auth.${portal}-session-token`,
    callbackUrl: isProduction
      ? `__Secure-next-auth.${portal}-callback-url`
      : `next-auth.${portal}-callback-url`,
    csrfToken: isProduction
      ? `__Host-next-auth.${portal}-csrf-token`
      : `next-auth.${portal}-csrf-token`,
  };
}

export const candidatSessionCookieName = buildCookieNames("candidat").sessionToken;
export const staffSessionCookieName = buildCookieNames("staff").sessionToken;
