-- CreateEnum
CREATE TYPE "CiviliteLogement" AS ENUM ('M', 'MME');

-- CreateEnum
CREATE TYPE "StatutLogementReservation" AS ENUM ('soumis', 'transmis', 'erreur');

-- CreateTable
CREATE TABLE "LogementReservation" (
    "id" TEXT NOT NULL,
    "candidatId" TEXT NOT NULL,
    "civilite" "CiviliteLogement" NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "dateNaissance" TEXT NOT NULL,
    "nationalite" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "agenceAccompagnante" TEXT,
    "numeroPasseport" TEXT NOT NULL,
    "paysDemandeVisa" TEXT NOT NULL,
    "villeEtablissementFrance" TEXT NOT NULL,
    "dateArriveePrevue" TEXT NOT NULL,
    "fichierPasseportUrl" TEXT NOT NULL,
    "fichierAttestationInscriptionUrl" TEXT NOT NULL,
    "statut" "StatutLogementReservation" NOT NULL DEFAULT 'soumis',
    "erreurTransmission" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogementReservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LogementReservation_candidatId_idx" ON "LogementReservation"("candidatId");

-- AddForeignKey
ALTER TABLE "LogementReservation" ADD CONSTRAINT "LogementReservation_candidatId_fkey" FOREIGN KEY ("candidatId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
