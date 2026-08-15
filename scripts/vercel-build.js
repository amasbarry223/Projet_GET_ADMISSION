/**
 * Build Vercel / CI : prisma generate + next build.
 * Requiert DATABASE_URL (Postgres Supabase pooler) dans les env du projet.
 */
const { execSync } = require("node:child_process");

const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";

if (!process.env.DATABASE_URL) {
  console.error(
    "[vercel-build] DATABASE_URL manquant. Ajoute l’URL Postgres (Transaction pooler) dans Vercel → Environment Variables.",
  );
  process.exit(1);
}

if (
  process.env.DATABASE_URL.includes("[PASSWORD]") ||
  process.env.DATABASE_URL.startsWith("file:")
) {
  console.error(
    "[vercel-build] DATABASE_URL invalide (placeholder [PASSWORD] ou SQLite file:). Configure l’URL Postgres Supabase réelle.",
  );
  process.exit(1);
}

if (!process.env.DIRECT_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

// ─── Vérifications de sécurité en production ──────────────────────────────────

const DEFAULT_SECRET_VALUES = [
  "change-me-to-a-long-random-string",
  "build-placeholder-change-me-in-vercel",
  "secret",
  "changeme",
];

if (!process.env.NEXTAUTH_SECRET) {
  if (isProduction) {
    console.error(
      "[vercel-build] NEXTAUTH_SECRET manquant en production ! Génère un secret fort avec : openssl rand -base64 64",
    );
    process.exit(1);
  }
  process.env.NEXTAUTH_SECRET = "build-placeholder-change-me-in-vercel";
} else if (isProduction && DEFAULT_SECRET_VALUES.includes(process.env.NEXTAUTH_SECRET)) {
  console.error(
    "[vercel-build] CRITICAL: NEXTAUTH_SECRET est la valeur par défaut en production !\n" +
    "Tous les JWT sont forgables. Génère un vrai secret : openssl rand -base64 64\n" +
    "puis injecte-le dans Vercel → Project Settings → Environment Variables.",
  );
  process.exit(1);
}

if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
}

// Avertir si Upstash Redis non configuré en production (rate limiting inopérant)
if (isProduction && (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN)) {
  console.warn(
    "[vercel-build] AVERTISSEMENT : UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN non configurés.\n" +
    "Le rate limiting sera par instance mémoire et contournable sur Vercel (multi-instance).\n" +
    "Configure Upstash Redis via Vercel Marketplace pour un rate limiting distribué.",
  );
}

// Avertir si GeniusPay en mode sandbox en production
if (isProduction && process.env.GENIUSPAY_API_KEY?.startsWith("sk_sandbox_")) {
  console.warn(
    "[vercel-build] AVERTISSEMENT : GENIUSPAY_API_KEY est une clé SANDBOX en production !\n" +
    "Les paiements réels ne seront pas encaissés. Remplace par les clés live GeniusPay.",
  );
}

// ──────────────────────────────────────────────────────────────────────────────

const dbHost = (() => {
  try {
    return new URL(process.env.DATABASE_URL).host;
  } catch {
    return "(invalid DATABASE_URL)";
  }
})();

console.log(`[vercel-build] Connexion DB : ${dbHost}`);
execSync("npx prisma@6 generate", { stdio: "inherit", env: process.env });
execSync("npx next build", { stdio: "inherit", env: process.env });
