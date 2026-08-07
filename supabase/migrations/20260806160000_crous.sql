-- CreateEnum
CREATE TYPE "StatutDemandeCrous" AS ENUM ('BROUILLON', 'EN_COURS', 'PARTAGEE', 'CLOTUREE');

-- CreateTable
CREATE TABLE "DemandeCrous" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "candidatId" TEXT NOT NULL,
    "statut" "StatutDemandeCrous" NOT NULL DEFAULT 'BROUILLON',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemandeCrous_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandeCrousDocument" (
    "id" TEXT NOT NULL,
    "demandeId" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "nomFichier" TEXT NOT NULL,
    "cheminFichier" TEXT NOT NULL,
    "taille" TEXT,
    "televerseLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemandeCrousDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoriquePartageCrous" (
    "id" TEXT NOT NULL,
    "demandeId" TEXT NOT NULL,
    "auteurId" TEXT NOT NULL,
    "destinataire" TEXT NOT NULL,
    "methode" TEXT NOT NULL,
    "documents" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'succes',
    "erreur" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoriquePartageCrous_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DemandeCrous_dossierId_idx" ON "DemandeCrous"("dossierId");

-- CreateIndex
CREATE INDEX "DemandeCrous_candidatId_idx" ON "DemandeCrous"("candidatId");

-- CreateIndex
CREATE INDEX "DemandeCrousDocument_demandeId_idx" ON "DemandeCrousDocument"("demandeId");

-- CreateIndex
CREATE INDEX "HistoriquePartageCrous_demandeId_idx" ON "HistoriquePartageCrous"("demandeId");

-- CreateIndex
CREATE INDEX "HistoriquePartageCrous_auteurId_idx" ON "HistoriquePartageCrous"("auteurId");

-- AddForeignKey
ALTER TABLE "DemandeCrous" ADD CONSTRAINT "DemandeCrous_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeCrous" ADD CONSTRAINT "DemandeCrous_candidatId_fkey" FOREIGN KEY ("candidatId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeCrousDocument" ADD CONSTRAINT "DemandeCrousDocument_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "DemandeCrous"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoriquePartageCrous" ADD CONSTRAINT "HistoriquePartageCrous_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "DemandeCrous"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoriquePartageCrous" ADD CONSTRAINT "HistoriquePartageCrous_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
