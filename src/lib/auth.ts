import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import type { Role } from "@prisma/client";
import { isStaff } from "@/lib/rbac";
import { isRateLimited } from "@/lib/rate-limit";
import { verifyOtpBridgeToken } from "@/lib/otp-bridge";
import {
  API_ROUTES,
  JWT_REVALIDATE_INTERVAL_MS,
  SESSION_MAX_AGE_SECONDS,
} from "@/shared/constants";

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

const isProduction = process.env.NODE_ENV === "production";
const cookieSecure = isProduction;
const sessionCookieName = isProduction
  ? "__Secure-next-auth.session-token"
  : "next-auth.session-token";
const callbackCookieName = isProduction
  ? "__Secure-next-auth.callback-url"
  : "next-auth.callback-url";
const csrfCookieName = isProduction
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

function markLastLogin(userId: string) {
  void db.user
    .update({ where: { id: userId }, data: { lastLoginAt: new Date() } })
    .catch(() => undefined);
}

async function authorizeViaOtpBridge(bridgeToken: string): Promise<AuthUser | null> {
  const userId = verifyOtpBridgeToken(bridgeToken);
  if (!userId) return null;

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || !user.actif || user.role !== "CANDIDAT") return null;

  markLastLogin(user.id);
  return toAuthUser(user);
}

async function authorizeViaPasswordCredentials(params: {
  email: string;
  password: string;
  portal: Portal;
}): Promise<AuthUser | null> {
  const normalizedEmail = params.email.toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return null;

  if (await isRateLimited(normalizedEmail, API_ROUTES.AUTH_CALLBACK_CREDENTIALS)) {
    return null;
  }

  const user = await db.user.findUnique({ where: { email: normalizedEmail } });
  if (!user || !user.passwordHash) return null;

  const isPasswordValid = await bcrypt.compare(params.password, user.passwordHash);
  if (!isPasswordValid) return null;

  // Refus silencieux si le portail ne correspond pas au rôle (anti-énumération)
  if (params.portal === "candidat" && user.role !== "CANDIDAT") return null;
  if (params.portal === "staff" && !isStaff(user.role)) return null;

  // Compte suspendu : message distinct (identifiants déjà validés)
  if (!user.actif) {
    throw new Error("ACCOUNT_SUSPENDED");
  }

  // BF-06 : bloquer la connexion si e-mail non vérifié (paramètre agence)
  if (user.role === "CANDIDAT" && !user.emailVerified) {
    const parametres = await db.parametre.findUnique({ where: { id: 1 } });
    if (parametres?.exigerEmailVerifie) return null;
  }

  markLastLogin(user.id);
  return toAuthUser(user);
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
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
        if (credentials?.bridgeToken) {
          return authorizeViaOtpBridge(credentials.bridgeToken);
        }

        if (!credentials?.email || !credentials?.password) return null;

        const portal = parsePortal(credentials.portal);
        if (!portal) return null;

        return authorizeViaPasswordCredentials({
          email: credentials.email,
          password: credentials.password,
          portal,
        });
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        const authUser = user as AuthUser;
        token.id = authUser.id;
        token.role = authUser.role;
        token.prenom = authUser.prenom;
        token.nom = authUser.nom;
        token.image = authUser.image;
        token.lastValidated = Date.now();
      }

      const lastValidatedAt =
        typeof token.lastValidated === "number" ? token.lastValidated : 0;
      const shouldRefreshFromDatabase =
        !lastValidatedAt ||
        Date.now() - lastValidatedAt > JWT_REVALIDATE_INTERVAL_MS ||
        trigger === "update";

      if (shouldRefreshFromDatabase && token.id) {
        const databaseUser = await db.user.findUnique({
          where: { id: String(token.id) },
          select: { role: true, actif: true, prenom: true, nom: true, photoUrl: true },
        });
        if (!databaseUser || !databaseUser.actif) {
          token.error = "inactive";
          token.lastValidated = Date.now();
          Reflect.deleteProperty(token, "role");
          return token;
        }
        token.role = databaseUser.role;
        token.prenom = databaseUser.prenom;
        token.nom = databaseUser.nom;
        token.image = databaseUser.photoUrl;
        token.error = undefined;
        token.lastValidated = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      if (token.error === "inactive") {
        return { ...session, user: undefined as unknown as typeof session.user };
      }
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.prenom = token.prenom;
        session.user.nom = token.nom;
        session.user.image = token.image;
      }
      return session;
    },
  },
};
