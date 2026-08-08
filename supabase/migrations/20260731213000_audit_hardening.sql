-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);

-- AlterTable: BF-06 — exiger vérif e-mail par défaut
ALTER TABLE "Parametre" ALTER COLUMN "exigerEmailVerifie" SET DEFAULT true;
UPDATE "Parametre" SET "exigerEmailVerifie" = true WHERE id = 1;
