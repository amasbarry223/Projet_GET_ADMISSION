/**
 * Build Vercel / CI : prisma generate + next build.
 * Requiert DATABASE_URL (Postgres Supabase pooler) dans les env du projet.
 */
const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

if (!process.env.DATABASE_URL) {
  const envPath = path.resolve(__dirname, "../.env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

const isVercel = process.env.VERCEL === "1" || process.env.VERCEL_ENV === "production";
const isProduction = isVercel || process.env.NODE_ENV === "production";

if (!process.env.DATABASE_URL) {
  if (isVercel) {
    console.error(
      "[vercel-build] DATABASE_URL manquant. Ajoute l’URL Postgres (Transaction pooler) dans Vercel → Environment Variables.",
    );
    process.exit(1);
  } else {
    process.env.DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/postgres?schema=public";
  }
}

if (
  process.env.DATABASE_URL.includes("[PASSWORD]") ||
  process.env.DATABASE_URL.startsWith("file:")
) {
  if (isVercel) {
    console.error(
      "[vercel-build] DATABASE_URL invalide (placeholder [PASSWORD] ou SQLite file:). Configure l’URL Postgres Supabase réelle.",
    );
    process.exit(1);
  } else {
    console.warn("[vercel-build] DATABASE_URL local contient [PASSWORD] — utilisation du schéma local pour générer Prisma.");
    process.env.DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/postgres?schema=public";
  }
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
  console.warn(
    "[vercel-build] ATTENTION : NEXTAUTH_SECRET non défini. Utilisation d'un secret temporaire pour le build.",
  );
  process.env.NEXTAUTH_SECRET = "build-placeholder-change-me-in-vercel";
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
    "Le rate limiting sera par instance mémoire.",
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
execSync("npx prisma generate", { stdio: "inherit", env: process.env });
execSync("npx next build", { stdio: "inherit", env: process.env });
