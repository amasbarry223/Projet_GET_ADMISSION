import { withAuth } from "next-auth/middleware";

// Middleware RBAC : protège /espace* et /admin*
// - /espace* : nécessite une authentification (tous rôles)
// - /admin* : nécessite un rôle staff (CONSEILLER, FINANCIER, ADMIN, SUPER_ADMIN)
export default withAuth({
  pages: {
    signIn: "/connexion",
  },
  callbacks: {
    authorized: ({ token, req }) => {
      const path = req.nextUrl.pathname;
      // /espace* : juste besoin d'être connecté
      if (path.startsWith("/espace")) {
        return !!token;
      }
      // /admin* : besoin d'un rôle staff
      if (path.startsWith("/admin")) {
        const role = token?.role as string | undefined;
        return ["CONSEILLER", "FINANCIER", "ADMIN", "SUPER_ADMIN"].includes(role ?? "");
      }
      return !!token;
    },
  },
});

export const config = {
  matcher: ["/espace/:path*", "/admin/:path*"],
};
