/**
 * Build Vercel / CI : prisma generate + next build.
 * Requiert DATABASE_URL (Postgres Supabase pooler) dans les env du projet.
 */
const { execSync } = require("node:child_process");

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

if (!process.env.NEXTAUTH_SECRET) {
  process.env.NEXTAUTH_SECRET = "build-placeholder-change-me-in-vercel";
}

if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
}

const dbHost = (() => {
  try {
    return new URL(process.env.DATABASE_URL).host;
  } catch {
    return "(invalid DATABASE_URL)";
  }
})();
execSync("npx prisma@6 generate", { stdio: "inherit", env: process.env });
execSync("npx next build", { stdio: "inherit", env: process.env });
