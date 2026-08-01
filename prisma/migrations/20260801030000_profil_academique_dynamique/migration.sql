-- Dossier académique dynamique + type établissement public/privé

-- Enums
CREATE TYPE "TypeEtablissement" AS ENUM ('PUBLIC', 'PRIVE');
CREATE TYPE "StatutCandidat" AS ENUM ('LYCEEN', 'BACHELIER');
CREATE TYPE "NiveauEtudesSuperieures" AS ENUM ('AUCUN', 'L1', 'L2', 'L3', 'DUT_BTS', 'MASTER_PLUS');

-- Université : type public/privé
ALTER TABLE "Universite"
  ADD COLUMN "typeEtablissement" "TypeEtablissement" NOT NULL DEFAULT 'PRIVE';

-- Pièces enrichies
ALTER TABLE "Piece"
  ADD COLUMN "code" TEXT,
  ADD COLUMN "categorie" TEXT NOT NULL DEFAULT 'academique',
  ADD COLUMN "obligatoire" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "Piece_dossierId_code_idx" ON "Piece"("dossierId", "code");

-- Profil académique candidat
CREATE TABLE "ProfilAcademique" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "statutCandidat" "StatutCandidat" NOT NULL,
  "classeActuelle" TEXT,
  "aObtenuBac" BOOLEAN NOT NULL DEFAULT false,
  "trimestresSeconde" INTEGER NOT NULL DEFAULT 3,
  "trimestresPremiere" INTEGER NOT NULL DEFAULT 3,
  "trimestresTerminale" INTEGER NOT NULL DEFAULT 2,
  "attestationScolariteDisponible" BOOLEAN NOT NULL DEFAULT false,
  "niveauEtudesSuperieures" "NiveauEtudesSuperieures" NOT NULL DEFAULT 'AUCUN',
  "formationEnCours" BOOLEAN NOT NULL DEFAULT false,
  "diplomesObtenus" TEXT NOT NULL DEFAULT '[]',
  "redoublements" TEXT NOT NULL DEFAULT '[]',
  "interruptions" TEXT NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProfilAcademique_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProfilAcademique_userId_key" ON "ProfilAcademique"("userId");
CREATE INDEX "ProfilAcademique_statutCandidat_idx" ON "ProfilAcademique"("statutCandidat");

ALTER TABLE "ProfilAcademique"
  ADD CONSTRAINT "ProfilAcademique_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Aligner fourchette paramètres frais d'agence
UPDATE "Parametre"
SET "fraisMin" = 65000, "fraisMax" = 110000
WHERE "id" = 1;
