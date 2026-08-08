-- La table "LogementReservation" actuelle correspond en réalité à la demande CROUS
-- (nom d'usage, lieu/pays de naissance, sexe, passeport recto/verso, accord préalable).
-- On la renomme en DemandeLogementCrous — service distinct de la réservation de logement —
-- puis on recrée LogementReservation avec ses champs d'origine (réservation classique).
ALTER TABLE "LogementReservation" RENAME TO "DemandeLogementCrous";
ALTER TABLE "DemandeLogementCrous" RENAME CONSTRAINT "LogementReservation_pkey" TO "DemandeLogementCrous_pkey";
ALTER TABLE "DemandeLogementCrous" RENAME CONSTRAINT "LogementReservation_candidatId_fkey" TO "DemandeLogementCrous_candidatId_fkey";
ALTER INDEX "LogementReservation_candidatId_idx" RENAME TO "DemandeLogementCrous_candidatId_idx";

-- Recrée LogementReservation avec ses champs d'origine
CREATE TYPE "CiviliteLogement" AS ENUM ('M', 'MME');

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
    "motifCorrection" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogementReservation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LogementReservation_candidatId_idx" ON "LogementReservation"("candidatId");

ALTER TABLE "LogementReservation" ADD CONSTRAINT "LogementReservation_candidatId_fkey" FOREIGN KEY ("candidatId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
