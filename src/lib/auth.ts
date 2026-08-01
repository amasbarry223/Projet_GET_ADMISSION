import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import type { Role } from "@prisma/client";
import { isStaff } from "@/lib/rbac";
import { isRateLimited } from "@/lib/rate-limit";
import { verifyOtpBridgeToken } from "@/lib/otp-bridge";

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

type Portal = "staff" | "candidat";

function parsePortal(raw: unknown): Portal | null {
  if (raw === "staff") return "staff";
  if (raw === "candidat" || raw === "etudiant") return "candidat";
  return null;
}

const isProd = process.env.NODE_ENV === "production";
const cookieSecure = isProd;
const sessionCookieName = isProd
  ? "__Secure-next-auth.session-token"
  : "next-auth.session-token";
const callbackCookieName = isProd
  ? "__Secure-next-auth.callback-url"
  : "next-auth.callback-url";
const csrfCookieName = isProd
  ? "__Host-next-auth.csrf-token"
  : "next-auth.csrf-token";

function toAuthUser(user: {
  id: string;
  email: string;
  prenom: string;
  nom: string;
  role: Role;
  photoUrl: string | null;
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: `${user.prenom} ${user.nom}`,
    role: user.role,
    prenom: user.prenom,
    nom: user.nom,
    image: user.photoUrl,
  };
}

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
      name: sessionCookieName,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: cookieSecure,
      },
    },
    callbackUrl: {
      name: callbackCookieName,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: cookieSecure,
      },
    },
    csrfToken: {
      name: csrfCookieName,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: cookieSecure,
      },
    },
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Mot de passe", type: "password" },
        portal: { label: "Portail", type: "text" },
        bridgeToken: { label: "OTP Bridge", type: "text" },
      },
      async authorize(credentials): Promise<AuthUser | null> {
        // --- Bridge OTP Supabase → session NextAuth (candidats) ---
        if (credentials?.bridgeToken) {
          const userId = verifyOtpBridgeToken(credentials.bridgeToken);
          if (!userId) return null;

          const user = await db.user.findUnique({ where: { id: userId } });
          if (!user || !user.actif || user.role !== "CANDIDAT") return null;

          void db.user
            .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
            .catch(() => undefined);

          return toAuthUser(user);
        }

        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const portal = parsePortal(credentials.portal);
        if (!portal) {
          return null;
        }

        // Les candidats se connectent uniquement par OTP
        if (portal === "candidat") {
          return null;
        }

        const email = credentials.email.toLowerCase().trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return null;
        }

        // Rate-limit par e-mail (5 / min) — même clé que le callback credentials
        if (isRateLimited(email, "/api/auth/callback/credentials")) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email },
        });

        if (!user || !user.actif || !user.passwordHash) {
          return null;
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) {
          return null;
        }

        if (!isStaff(user.role)) {
          return null;
        }

        void db.user
          .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
          .catch(() => undefined);

        return toAuthUser(user);
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
          token.error = "inactive";
          token.lastValidated = Date.now();
          delete (token as { role?: unknown }).role;
          return token;
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
