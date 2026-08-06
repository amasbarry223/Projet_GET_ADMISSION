-- CreateEnum
CREATE TYPE "StatutDemandeCorrection" AS ENUM ('EN_ATTENTE', 'SOUMISE', 'VALIDEE', 'REMPLACEE');

-- CreateTable
CREATE TABLE "DemandeCorrection" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "conseillerId" TEXT NOT NULL,
    "motif" TEXT NOT NULL,
    "statut" "StatutDemandeCorrection" NOT NULL DEFAULT 'EN_ATTENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "soumiseLe" TIMESTAMP(3),
    "traiteeLe" TIMESTAMP(3),

    CONSTRAINT "DemandeCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DemandeCorrection_dossierId_createdAt_idx" ON "DemandeCorrection"("dossierId", "createdAt");

-- CreateIndex
CREATE INDEX "DemandeCorrection_dossierId_statut_idx" ON "DemandeCorrection"("dossierId", "statut");

-- AddForeignKey
ALTER TABLE "DemandeCorrection" ADD CONSTRAINT "DemandeCorrection_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeCorrection" ADD CONSTRAINT "DemandeCorrection_conseillerId_fkey" FOREIGN KEY ("conseillerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
