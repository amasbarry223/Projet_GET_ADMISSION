import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";
import { candidatSessionCookieName, staffSessionCookieName } from "@/lib/auth-cookies";
import { isStaff, permissionForAdminPath, hasPermission } from "@/lib/rbac";

function requireNextAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET manquant");
  return secret;
}

// Middleware RBAC :
// - /espace* : cookie de session "candidat" → login /connexion
// - /admin*  : cookie de session "staff" + permission par chemin → login /back-office
// Deux cookies distincts (voir src/lib/auth.ts) pour que le même navigateur puisse porter les
// deux identités en parallèle (un onglet par portail) sans que l'une écrase l'autre.
export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

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

    // Staff qui tente /espace avec un cookie candidat inexistant/expiré est déjà couvert
    // ci-dessus ; un token candidat valide a nécessairement role === "CANDIDAT" côté serveur
    // (authorize() du portail candidat refuse tout autre rôle), donc rien d'autre à vérifier ici.
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/espace/:path*", "/admin/:path*"],
};
