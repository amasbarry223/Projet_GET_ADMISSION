// Étend les types NextAuth pour inclure le rôle RBAC
import type { DefaultSession } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "CANDIDAT" | "CONSEILLER" | "FINANCIER" | "ADMIN" | "SUPER_ADMIN";
      prenom: string;
      nom: string;
      image: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: "CANDIDAT" | "CONSEILLER" | "FINANCIER" | "ADMIN" | "SUPER_ADMIN";
    prenom: string;
    nom: string;
    image: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: "CANDIDAT" | "CONSEILLER" | "FINANCIER" | "ADMIN" | "SUPER_ADMIN";
    prenom: string;
    nom: string;
    image: string | null;
  }
}
