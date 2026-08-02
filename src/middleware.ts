import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { isStaff, permissionForAdminPath, hasPermission } from "@/lib/rbac";

// Middleware RBAC :
// - /espace* : rôle CANDIDAT uniquement
// - /admin* : staff + permission par chemin (§5)
export default withAuth(
  function middleware(req) {
    const path = req.nextUrl.pathname;
    const role = req.nextauth.token?.role as string | undefined;

    // Staff qui tente /espace → back-office
    if (path.startsWith("/espace") && role && role !== "CANDIDAT") {
      const url = req.nextUrl.clone();
      url.pathname = hasPermission(role, "dashboard") ? "/admin" : "/connexion";
      return NextResponse.redirect(url);
    }

    if (path.startsWith("/admin")) {
      const needed = permissionForAdminPath(path);
      if (needed && !hasPermission(role, needed)) {
        const url = req.nextUrl.clone();
        if (hasPermission(role, "dossiers.read")) {
          url.pathname = "/admin/dossiers";
        } else if (hasPermission(role, "finance.read")) {
          url.pathname = "/admin/finance";
        } else {
          url.pathname = "/connexion";
        }
        return NextResponse.redirect(url);
      }
    }
    return NextResponse.next();
  },
  {
    pages: { signIn: "/connexion" },
    callbacks: {
      authorized: ({ token, req }) => {
        if (!token || token.error === "inactive") return false;
        const path = req.nextUrl.pathname;
        if (path.startsWith("/espace")) {
          return token.role === "CANDIDAT";
        }
        if (path.startsWith("/admin")) {
          return isStaff(token.role as string | undefined);
        }
        return true;
      },
    },
  }
);

export const config = {
  matcher: ["/espace/:path*", "/admin/:path*"],
};
