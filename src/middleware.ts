import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";
import { candidatSessionCookieName, staffSessionCookieName } from "@/lib/auth-cookies";
import { isStaff, permissionForAdminPath, hasPermission } from "@/lib/rbac";

function requireNextAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET manquant");
  return secret;
}

const ADMIN_SECTIONS = new Set([
  "dossiers",
  "finance",
  "kyc",
  "catalogue",
  "matrice",
  "utilisateurs",
  "parametres",
  "profil",
  "audit",
  "logement",
  "attestations",
  "messages-internes",
]);

const VITRINE_PATHS = new Set([
  "universites",
  "a-propos",
  "contact",
  "faq",
  "verifier",
  "mentions-legales",
  "politique-confidentialite",
  "inscription",
]);

// Middleware Multi-Domaines & RBAC :
// - Sous-domaine staff.* (ex: staff.get-admission.com ou staff.localhost) :
//   * Racine "/" -> redirige vers /admin (si connecté) ou /back-office (si non connecté)
//   * Routes staff directes (/dossiers, /finance, etc.) -> réécriture interne vers /admin/*
//   * Vitrine & Espace candidat -> redirection automatique vers le domaine principal
// - /admin*  : cookie de session "staff" + permission par chemin -> login /back-office
// - /espace* : cookie de session "candidat" -> login /connexion
export default async function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const isStaffSubdomain = /^(staff|admin|f)\./i.test(host);
  const path = req.nextUrl.pathname;

  // Manifeste PWA du back-office : aucune donnée sensible, accessible sans session
  if (path === "/admin/manifest.webmanifest") {
    return NextResponse.next();
  }

  // ─── 1. GESTION DU SOUS-DOMAINE STAFF (staff.get-admission.com / staff.localhost) ───
  if (isStaffSubdomain) {
    const firstSegment = path.split("/")[1] || "";

    // Tentative d'accès à la vitrine, connexion candidat ou espace candidat depuis le sous-domaine staff -> renvoi vers domaine principal
    if (
      VITRINE_PATHS.has(firstSegment) ||
      path.startsWith("/espace") ||
      path === "/connexion" ||
      path === "/login" ||
      path === "/inscription" ||
      path === "/mot-de-passe-oublie" ||
      path === "/reinitialiser-mot-de-passe" ||
      path === "/verification-email" ||
      path === "/verification-otp"
    ) {
      const mainHost = host.replace(/^(staff|admin|f)\./i, "");
      const proto = req.headers.get("x-forwarded-proto") || "https";
      const redirectUrl = new URL(path + req.nextUrl.search, `${proto}://${mainHost}`);
      return NextResponse.redirect(redirectUrl);
    }

    // Racine "/" du sous-domaine staff
    if (path === "/") {
      const token = await getToken({
        req,
        secret: requireNextAuthSecret(),
        cookieName: staffSessionCookieName,
      });
      const role = token?.role as string | undefined;

      if (token && token.error !== "inactive" && isStaff(role)) {
        const url = req.nextUrl.clone();
        url.pathname = "/admin";
        return NextResponse.redirect(url);
      } else {
        const url = req.nextUrl.clone();
        url.pathname = "/back-office";
        return NextResponse.redirect(url);
      }
    }

    // Raccourcis directs : staff.get-admission.com/dossiers -> /admin/dossiers
    if (ADMIN_SECTIONS.has(firstSegment)) {
      const targetPath = `/admin${path}`;
      const url = req.nextUrl.clone();
      url.pathname = targetPath;
      return NextResponse.rewrite(url);
    }
  }

  // ─── 2. DOMAINE PUBLIC : MASQUER TOTALEMENT LE BACK-OFFICE (404) ───
  // Tout accès à /admin* ou /back-office* sur le domaine public (ex: get-admission.com)
  // retourne une 404 immédiate pour garantir une invisibilité totale et obliger le staff à passer par staff.get-admission.com
  if (!isStaffSubdomain && (path.startsWith("/admin") || path === "/back-office" || path.startsWith("/back-office/"))) {
    const url = req.nextUrl.clone();
    url.pathname = "/not-found";
    return NextResponse.rewrite(url, { status: 404 });
  }

  // ─── 3. SÉCURITÉ & RBAC ROUTES /admin* SUR SOUS-DOMAINE STAFF ───
  if (path.startsWith("/admin")) {
    const token = await getToken({
      req,
      secret: requireNextAuthSecret(),
      cookieName: staffSessionCookieName,
    });
    const role = token?.role as string | undefined;

    if (!token || token.error === "inactive" || !isStaff(role)) {
      const url = req.nextUrl.clone();
      url.pathname = "/back-office";
      url.search = "";
      url.searchParams.set("callbackUrl", path);
      return NextResponse.redirect(url);
    }

    const needed = permissionForAdminPath(path);
    if (needed && !hasPermission(role, needed)) {
      const url = req.nextUrl.clone();
      url.search = "";
      if (hasPermission(role, "dossiers.read")) {
        url.pathname = "/admin/dossiers";
      } else if (hasPermission(role, "finance.read")) {
        url.pathname = "/admin/finance";
      } else if (hasPermission(role, "dashboard")) {
        url.pathname = "/admin";
      } else {
        url.pathname = "/back-office";
      }
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // ─── 3. SÉCURITÉ & RBAC ROUTES /espace* (Espace Candidat) ───
  if (path.startsWith("/espace")) {
    const token = await getToken({
      req,
      secret: requireNextAuthSecret(),
      cookieName: candidatSessionCookieName,
    });

    if (!token || token.error === "inactive") {
      const url = req.nextUrl.clone();
      url.pathname = "/connexion";
      url.search = "";
      url.searchParams.set("callbackUrl", path);
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};
