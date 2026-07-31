import path from "node:path";
import { PrismaClient } from "@prisma/client";

/**
 * Sur Vercel / CI, DATABASE_URL peut être absent au moment du chargement du module.
 * SQLite relatif au schéma Prisma (prisma/schema.prisma) → ../db/custom.db
 */
function ensureDatabaseUrl() {
  if (process.env.DATABASE_URL) return;
  const absolute = path.join(process.cwd(), "db", "custom.db");
  // Prisma résout aussi file: relatif au dossier schema — les deux formats marchent
  process.env.DATABASE_URL = `file:${absolute.replace(/\\/g, "/")}`;
}

ensureDatabaseUrl();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
