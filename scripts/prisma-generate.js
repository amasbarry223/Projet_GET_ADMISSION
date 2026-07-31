/**
 * prisma generate — n’a pas besoin d’une DB réelle, seulement des env déclarées dans schema.prisma.
 * Placeholder local pour le postinstall si DATABASE_URL / DIRECT_URL absents ou incomplets.
 */
const { execSync } = require("node:child_process");

const placeholder =
  "postgresql://postgres:postgres@127.0.0.1:5432/postgres?schema=public";

function needsPlaceholder(url) {
  return !url || url.includes("[PASSWORD]") || url.startsWith("file:");
}

if (needsPlaceholder(process.env.DATABASE_URL)) {
  process.env.DATABASE_URL = placeholder;
}
if (needsPlaceholder(process.env.DIRECT_URL)) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

execSync("npx prisma generate", { stdio: "inherit", env: process.env });
