import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { isStaff, permissionForAdminPath, hasPermission } from "@/lib/rbac";

// Middleware RBAC :
// - /espace* : rôle CANDIDAT uniquement → login /connexion
// - /admin* : staff + permission par chemin → login /back-office
export default withAuth(
  function middleware(req) {
    const path = req.nextUrl.pathname;
    const token = req.nextauth.token;
    const role = token?.role as string | undefined;

    // /admin : pas de session staff → page login back-office
    if (path.startsWith("/admin")) {
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

    // Staff qui tente /espace → back-office (ou dashboard)
    if (path.startsWith("/espace") && role && role !== "CANDIDAT") {
      const url = req.nextUrl.clone();
      url.search = "";
      url.pathname = hasPermission(role, "dashboard") ? "/admin" : "/back-office";
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  },
  {
    pages: { signIn: "/connexion" },
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;

        // Admin : toujours entrer dans le middleware pour rediriger vers /back-office
        if (path.startsWith("/admin")) {
          return true;
        }

        // Espace : NextAuth renvoie vers /connexion si non authentifié
        if (path.startsWith("/espace")) {
          if (!token || token.error === "inactive") return false;
          return true;
        }

        return true;
      },
    },
  },
);

export const config = {
  matcher: ["/espace/:path*", "/admin/:path*"],
};
