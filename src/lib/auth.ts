import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import type { Role } from "@prisma/client";

// Type étendu pour l'utilisateur retourné par authorize()
type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  prenom: string;
  nom: string;
  image: string | null;
};

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24h
  },
  pages: {
    signIn: "/connexion",
  },
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    callbackUrl: {
      name: "next-auth.callback-url",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name: "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials): Promise<AuthUser | null> {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email.toLowerCase().trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email },
        });

        if (!user || !user.actif) {
          return null;
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) {
          return null;
        }

        // BF-06 : optionnellement exiger la vérification e-mail (paramètre agence)
        try {
          const params = await db.parametre.findUnique({ where: { id: 1 } });
          if (params?.exigerEmailVerifie && user.role === "CANDIDAT" && !user.emailVerified) {
            throw new Error("EMAIL_NOT_VERIFIED");
          }
        } catch (e) {
          if (e instanceof Error && e.message === "EMAIL_NOT_VERIFIED") {
            throw e;
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: `${user.prenom} ${user.nom}`,
          role: user.role,
          prenom: user.prenom,
          nom: user.nom,
          image: user.photoUrl,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        const u = user as AuthUser;
        token.id = u.id;
        token.role = u.role;
        token.prenom = u.prenom;
        token.nom = u.nom;
        token.image = u.image;
        token.lastValidated = Date.now();
      }

      // Revalider rôle + actif depuis la DB (au plus toutes les 5 min)
      const last = typeof token.lastValidated === "number" ? token.lastValidated : 0;
      const shouldRefresh = !last || Date.now() - last > 5 * 60 * 1000 || trigger === "update";
      if (shouldRefresh && token.id) {
        const dbUser = await db.user.findUnique({
          where: { id: String(token.id) },
          select: { role: true, actif: true, prenom: true, nom: true, photoUrl: true },
        });
        if (!dbUser || !dbUser.actif) {
          return { ...token, role: undefined, error: "inactive", lastValidated: Date.now() };
        }
        token.role = dbUser.role;
        token.prenom = dbUser.prenom;
        token.nom = dbUser.nom;
        token.image = dbUser.photoUrl;
        token.error = undefined;
        token.lastValidated = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      if (token.error === "inactive") {
        // Session invalide : le middleware / pages verront l'absence de rôle staff/candidat
        return { ...session, user: undefined as unknown as typeof session.user };
      }
      if (session.user) {
        const u = session.user as Record<string, unknown>;
        u.id = token.id;
        u.role = token.role;
        u.prenom = token.prenom;
        u.nom = token.nom;
        u.image = token.image;
      }
      return session;
    },
  },
};

export { authOptions };
