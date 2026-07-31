/** prisma generate avec DATABASE_URL de secours (Vercel postinstall). */
const { execSync } = require("node:child_process");

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:../db/custom.db";
}

execSync("npx prisma generate", { stdio: "inherit", env: process.env });
