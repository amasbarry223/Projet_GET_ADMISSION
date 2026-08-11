-- CreateEnum
CREATE TYPE "StatutVisa" AS ENUM ('ACCORDE', 'REFUSE');

-- AlterEnum
ALTER TYPE "StatutLogementReservation" ADD VALUE 'traite';

-- AlterTable
ALTER TABLE "Parametre" ALTER COLUMN "fraisMin" SET DEFAULT 65000,
ALTER COLUMN "fraisMax" SET DEFAULT 110000,
ALTER COLUMN "exigerEmailVerifie" SET DEFAULT false;

-- CreateTable
CREATE TABLE "DemandeVisa" (
    "id" TEXT NOT NULL,
    "candidatId" TEXT NOT NULL,
    "statut" "StatutVisa" NOT NULL,
    "fichierVisaUrl" TEXT,
    "motifRefus" TEXT,
    "remarqueAdmin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemandeVisa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DemandeVisa_candidatId_key" ON "DemandeVisa"("candidatId");

-- AddForeignKey
ALTER TABLE "DemandeVisa" ADD CONSTRAINT "DemandeVisa_candidatId_fkey" FOREIGN KEY ("candidatId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

