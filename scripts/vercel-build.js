/**
 * Build Vercel / CI : garantit DATABASE_URL puis prisma generate + next build.
 * SQLite embarqué : db/custom.db (seedé, versionné).
 */
const { execSync } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");

const dbFile = path.join(__dirname, "..", "db", "custom.db");
if (!fs.existsSync(dbFile)) {
  console.warn("[vercel-build] db/custom.db introuvable — le build peut échouer à runtime.");
}

if (!process.env.DATABASE_URL) {
  // Relatif au schema Prisma (prisma/)
  process.env.DATABASE_URL = "file:../db/custom.db";
}

if (!process.env.NEXTAUTH_SECRET) {
  // Placeholder build-only — à surcharger dans Vercel Project Settings
  process.env.NEXTAUTH_SECRET = "build-placeholder-change-me-in-vercel";
}

if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
}

console.log("[vercel-build] DATABASE_URL=", process.env.DATABASE_URL);

execSync("npx prisma generate", { stdio: "inherit", env: process.env });
execSync("npx next build", { stdio: "inherit", env: process.env });
