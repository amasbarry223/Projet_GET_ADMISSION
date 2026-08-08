-- ============================================================
-- Schéma complet Get_AdmissionV — généré depuis prisma/migrations
-- Concaténation des 19 migrations dans l'ordre chronologique.
-- À exécuter tel quel dans Supabase SQL Editor sur une base VIDE.
-- Généré le 2026-08-07 23:30
-- ============================================================


-- ============================================================
-- Migration: 20260731142000_init_postgres
-- ============================================================
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CANDIDAT', 'CONSEILLER', 'FINANCIER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "EtatDossier" AS ENUM ('BROUILLON', 'SOUMIS', 'VERIFICATION', 'CORRECTION', 'PAIEMENT_ATTENTE', 'PAIEMENT_CONFIRME', 'TRANSMIS', 'ATTENTE_REPONSE', 'PRE_ADMISSION', 'REFUSE', 'ATTESTATION', 'CLOTURE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "telephone" TEXT,
    "nationalite" TEXT,
    "dateNaissance" TEXT,
    "adresse" TEXT,
    "photoUrl" TEXT,
    "kycType" TEXT,
    "kycNumero" TEXT,
    "kycRectoPath" TEXT,
    "kycVersoPath" TEXT,
    "kycVerifie" BOOLEAN NOT NULL DEFAULT false,
    "kycVerifieLe" TIMESTAMP(3),
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "emailVerified" TIMESTAMP(3),
    "verifyToken" TEXT,
    "resetToken" TEXT,
    "resetTokenExpires" TIMESTAMP(3),
    "role" "Role" NOT NULL DEFAULT 'CANDIDAT',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Universite" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "pays" TEXT NOT NULL,
    "drapeau" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "ecusson" TEXT NOT NULL,
    "domaines" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "pointsForts" TEXT NOT NULL,
    "imageCouleur" TEXT NOT NULL,
    "siteUrl" TEXT,
    "logoUrl" TEXT,
    "coverUrl" TEXT,
    "galleryUrls" TEXT NOT NULL DEFAULT '[]',
    "fraisMin" INTEGER NOT NULL,
    "fraisMax" INTEGER NOT NULL,
    "partenaire" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Universite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Formation" (
    "id" TEXT NOT NULL,
    "universiteId" TEXT NOT NULL,
    "intitule" TEXT NOT NULL,
    "niveau" TEXT NOT NULL,
    "domaine" TEXT NOT NULL,
    "duree" TEXT NOT NULL,
    "fraisAgence" INTEGER NOT NULL,
    "prerequis" TEXT NOT NULL,
    "piecesRequises" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Formation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dossier" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "candidatId" TEXT NOT NULL,
    "universiteId" TEXT NOT NULL,
    "formationId" TEXT NOT NULL,
    "etat" "EtatDossier" NOT NULL DEFAULT 'BROUILLON',
    "etapeActuelle" INTEGER NOT NULL DEFAULT 1,
    "conseillerId" TEXT,
    "fraisAgence" INTEGER NOT NULL,
    "paiementStatut" TEXT NOT NULL DEFAULT 'aucun',
    "mrz" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dossier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Piece" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'manquante',
    "type" TEXT NOT NULL DEFAULT 'pdf',
    "taille" TEXT,
    "nomFichier" TEXT,
    "cheminFichier" TEXT,
    "televerseeLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Piece_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Historique" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "etat" "EtatDossier" NOT NULL,
    "auteur" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "auteurId" TEXT,

    CONSTRAINT "Historique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paiement" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "candidatId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "montant" INTEGER NOT NULL,
    "moyen" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'en_attente',
    "tranche" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Paiement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "candidatId" TEXT NOT NULL,
    "conseillerId" TEXT,
    "nonLusCandidat" INTEGER NOT NULL DEFAULT 0,
    "nonLusConseiller" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "auteurId" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "pieceJointeNom" TEXT,
    "pieceJointeTaille" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attestation" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "codeVerification" TEXT NOT NULL,
    "dateEmission" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modeRemise" TEXT NOT NULL DEFAULT 'telechargement',
    "emetteurId" TEXT NOT NULL,

    CONSTRAINT "Attestation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Statistique" (
    "id" SERIAL NOT NULL,
    "valeur" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Statistique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Temoignage" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "parcours" TEXT NOT NULL,
    "pays" TEXT NOT NULL,
    "citation" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Temoignage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembreEquipe" (
    "id" SERIAL NOT NULL,
    "initiales" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MembreEquipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faq" (
    "id" SERIAL NOT NULL,
    "question" TEXT NOT NULL,
    "reponse" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactInfo" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "email" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "adresses" TEXT NOT NULL,
    "horaires" TEXT NOT NULL,

    CONSTRAINT "ContactInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModeleAttestation" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "nbUsages" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ModeleAttestation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nationalite" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Nationalite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoyenPaiement" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "couleur" TEXT NOT NULL,
    "icone" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MoyenPaiement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObjetContact" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ObjetContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" SERIAL NOT NULL,
    "prenom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT,
    "objet" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "traite" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parametre" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "fraisMin" INTEGER NOT NULL DEFAULT 350000,
    "fraisMax" INTEGER NOT NULL DEFAULT 1750000,
    "paiementTranches" BOOLEAN NOT NULL DEFAULT true,
    "notifEmail" BOOLEAN NOT NULL DEFAULT true,
    "notifInApp" BOOLEAN NOT NULL DEFAULT true,
    "workflowStrict" BOOLEAN NOT NULL DEFAULT true,
    "exigerEmailVerifie" BOOLEAN NOT NULL DEFAULT false,
    "mentionsLegales" TEXT NOT NULL DEFAULT '',
    "politiqueConfidentialite" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Parametre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "userEmail" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "details" TEXT NOT NULL,
    "ip" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "lien" TEXT,
    "dossierId" TEXT,
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" SERIAL NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContenuSection" (
    "id" SERIAL NOT NULL,
    "cle" TEXT NOT NULL,
    "titre" TEXT,
    "contenu" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContenuSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Universite_slug_key" ON "Universite"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Dossier_reference_key" ON "Dossier"("reference");

-- CreateIndex
CREATE INDEX "Dossier_candidatId_idx" ON "Dossier"("candidatId");

-- CreateIndex
CREATE INDEX "Dossier_conseillerId_idx" ON "Dossier"("conseillerId");

-- CreateIndex
CREATE INDEX "Dossier_etat_idx" ON "Dossier"("etat");

-- CreateIndex
CREATE INDEX "Dossier_updatedAt_idx" ON "Dossier"("updatedAt");

-- CreateIndex
CREATE INDEX "Historique_dossierId_idx" ON "Historique"("dossierId");

-- CreateIndex
CREATE UNIQUE INDEX "Paiement_reference_key" ON "Paiement"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_dossierId_key" ON "Conversation"("dossierId");

-- CreateIndex
CREATE UNIQUE INDEX "Attestation_reference_key" ON "Attestation"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Attestation_dossierId_key" ON "Attestation"("dossierId");

-- CreateIndex
CREATE UNIQUE INDEX "Attestation_codeVerification_key" ON "Attestation"("codeVerification");

-- CreateIndex
CREATE UNIQUE INDEX "Nationalite_nom_key" ON "Nationalite"("nom");

-- CreateIndex
CREATE INDEX "ContactMessage_traite_idx" ON "ContactMessage"("traite");

-- CreateIndex
CREATE INDEX "ContactMessage_createdAt_idx" ON "ContactMessage"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_date_idx" ON "AuditLog"("date");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_resource_idx" ON "AuditLog"("resource");

-- CreateIndex
CREATE INDEX "Notification_userId_lu_idx" ON "Notification"("userId", "lu");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContenuSection_cle_key" ON "ContenuSection"("cle");

-- AddForeignKey
ALTER TABLE "Formation" ADD CONSTRAINT "Formation_universiteId_fkey" FOREIGN KEY ("universiteId") REFERENCES "Universite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dossier" ADD CONSTRAINT "Dossier_candidatId_fkey" FOREIGN KEY ("candidatId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dossier" ADD CONSTRAINT "Dossier_conseillerId_fkey" FOREIGN KEY ("conseillerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dossier" ADD CONSTRAINT "Dossier_universiteId_fkey" FOREIGN KEY ("universiteId") REFERENCES "Universite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dossier" ADD CONSTRAINT "Dossier_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "Formation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Piece" ADD CONSTRAINT "Piece_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Historique" ADD CONSTRAINT "Historique_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Historique" ADD CONSTRAINT "Historique_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_candidatId_fkey" FOREIGN KEY ("candidatId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_candidatId_fkey" FOREIGN KEY ("candidatId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_conseillerId_fkey" FOREIGN KEY ("conseillerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attestation" ADD CONSTRAINT "Attestation_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attestation" ADD CONSTRAINT "Attestation_emetteurId_fkey" FOREIGN KEY ("emetteurId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- ============================================================
-- Migration: 20260731213000_audit_hardening
-- ============================================================
-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);

-- AlterTable: BF-06 — exiger vérif e-mail par défaut
ALTER TABLE "Parametre" ALTER COLUMN "exigerEmailVerifie" SET DEFAULT true;
UPDATE "Parametre" SET "exigerEmailVerifie" = true WHERE id = 1;


-- ============================================================
-- Migration: 20260731233000_email_log_error
-- ============================================================
-- AlterTable
ALTER TABLE "EmailLog" ADD COLUMN IF NOT EXISTS "error" TEXT;


-- ============================================================
-- Migration: 20260801010000_candidat_otp_supabase
-- ============================================================
-- AlterTable
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "supabaseUserId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_supabaseUserId_key" ON "User"("supabaseUserId");


-- ============================================================
-- Migration: 20260801030000_profil_academique_dynamique
-- ============================================================
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


-- ============================================================
-- Migration MANQUANTE reconstituée : MatriceVersion / MatriceRegle
-- Ces deux tables existent dans prisma/schema.prisma et sur la base Supabase
-- réelle, mais aucune migration .sql ne les crée dans l'historique Prisma
-- (elles ont dû être ajoutées hors du flux prisma migrate). Ce bloc a été
-- reconstitué par introspection directe de la base Supabase de production
-- pour que ce script fonctionne sur une base vide — sans lui, la migration
-- suivante (FK Dossier.matriceVersionId -> MatriceVersion) échouerait.
-- ============================================================
-- CreateEnum
CREATE TYPE "MatriceStatut" AS ENUM ('BROUILLON', 'ACTIVE', 'ARCHIVEE');

-- CreateEnum
CREATE TYPE "MatriceCondition" AS ENUM ('TOUJOURS', 'LYCEEN', 'BACHELIER', 'BAC_OBTENU', 'BAC_OPTIONNEL_LYCEEN', 'NIVEAU_SUP_MIN', 'FORMATION_EN_COURS', 'ATTESTATION_SCOLARITE', 'REDOUBLEMENT', 'INTERRUPTION', 'IDENTITE', 'BULLETINS_LYCEE');

-- CreateTable
CREATE TABLE "MatriceVersion" (
    "id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "libelle" TEXT NOT NULL,
    "statut" "MatriceStatut" NOT NULL DEFAULT 'BROUILLON',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" TIMESTAMP(3),

    CONSTRAINT "MatriceVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatriceRegle" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "categorie" TEXT NOT NULL DEFAULT 'academique',
    "obligatoire" BOOLEAN NOT NULL DEFAULT true,
    "condition" "MatriceCondition" NOT NULL,
    "niveauMin" TEXT,
    "meta" TEXT NOT NULL DEFAULT '{}',
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MatriceRegle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MatriceVersion_numero_key" ON "MatriceVersion"("numero");

-- CreateIndex
CREATE INDEX "MatriceVersion_statut_idx" ON "MatriceVersion"("statut");

-- CreateIndex
CREATE INDEX "MatriceRegle_versionId_ordre_idx" ON "MatriceRegle"("versionId", "ordre");

-- CreateIndex
CREATE INDEX "MatriceRegle_versionId_code_idx" ON "MatriceRegle"("versionId", "code");

-- AddForeignKey
ALTER TABLE "MatriceRegle" ADD CONSTRAINT "MatriceRegle_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "MatriceVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ============================================================
-- Migration: 20260802130000_piece_unique_matrice_version
-- ============================================================
-- Alignement Prisma ↔ Postgres : unique Piece(dossierId, code) + matrice figée sur dossier
CREATE UNIQUE INDEX IF NOT EXISTS "Piece_dossierId_code_key"
ON "Piece" ("dossierId", code);

CREATE INDEX IF NOT EXISTS "Dossier_candidatId_formationId_idx"
ON "Dossier" ("candidatId", "formationId");

ALTER TABLE "Dossier" ADD COLUMN IF NOT EXISTS "matriceVersionId" TEXT;

CREATE INDEX IF NOT EXISTS "Dossier_matriceVersionId_idx"
ON "Dossier" ("matriceVersionId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Dossier_matriceVersionId_fkey'
  ) THEN
    ALTER TABLE "Dossier"
      ADD CONSTRAINT "Dossier_matriceVersionId_fkey"
      FOREIGN KEY ("matriceVersionId") REFERENCES "MatriceVersion"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;


-- ============================================================
-- Migration: 20260804160000_formation_frais_euros
-- ============================================================
-- AlterTable
ALTER TABLE "Formation" ADD COLUMN "fraisFormationEuros" INTEGER;


-- ============================================================
-- Migration: 20260806120000_add_demande_correction
-- ============================================================
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


-- ============================================================
-- Migration: 20260806130000_attestation_fichier
-- ============================================================
-- AlterTable
ALTER TABLE "Attestation" ADD COLUMN "cheminFichier" TEXT,
ADD COLUMN "nomFichier" TEXT;


-- ============================================================
-- Migration: 20260806140000_add_messages_internes
-- ============================================================
-- CreateTable
CREATE TABLE "ConversationInterne" (
    "id" TEXT NOT NULL,
    "financierId" TEXT NOT NULL,
    "nonLusFinancier" INTEGER NOT NULL DEFAULT 0,
    "nonLusAdmin" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationInterne_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageInterne" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "auteurId" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageInterne_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConversationInterne_financierId_key" ON "ConversationInterne"("financierId");

-- AddForeignKey
ALTER TABLE "ConversationInterne" ADD CONSTRAINT "ConversationInterne_financierId_fkey" FOREIGN KEY ("financierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageInterne" ADD CONSTRAINT "MessageInterne_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ConversationInterne"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageInterne" ADD CONSTRAINT "MessageInterne_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ============================================================
-- Migration: 20260806150000_procedure_admission_publique
-- ============================================================
-- CreateEnum
CREATE TYPE "TypeProcedure" AS ENUM ('PRIVEE', 'PUBLIQUE');

-- AlterTable
ALTER TABLE "Dossier" ADD COLUMN     "procedure" "TypeProcedure" NOT NULL DEFAULT 'PRIVEE';

-- AlterTable
ALTER TABLE "Universite" ADD COLUMN     "estPlaceholder" BOOLEAN NOT NULL DEFAULT false;

-- Établissement technique de réservation pour la procédure Université Publique : le candidat ne
-- le choisit jamais (masqué du catalogue via estPlaceholder), il sert uniquement de valeur par
-- défaut pour Dossier.universiteId/formationId tant que le staff n'a pas affecté un établissement
-- public réel. piecesRequises = '[]' pour ne rien ajouter à la matrice documentaire pilotée par le
-- profil académique du candidat.
INSERT INTO "Universite" (
  "id", "slug", "nom", "pays", "drapeau", "ville", "ecusson", "domaines", "description",
  "pointsForts", "imageCouleur", "galleryUrls", "typeEtablissement", "fraisMin", "fraisMax",
  "partenaire", "estPlaceholder", "createdAt", "updatedAt"
) VALUES (
  'placeholder-universite-publique',
  'procedure-publique-en-attente',
  'Sélection en cours — Université Publique',
  'France',
  '🇫🇷',
  '—',
  '—',
  '[]',
  'Établissement technique utilisé le temps que l''agence affecte un établissement public réel à ce dossier.',
  '[]',
  '#6B7280',
  '[]',
  'PUBLIC',
  65000,
  65000,
  false,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "Formation" (
  "id", "universiteId", "intitule", "niveau", "domaine", "duree", "fraisAgence",
  "prerequis", "piecesRequises", "createdAt", "updatedAt"
) VALUES (
  'placeholder-formation-publique',
  'placeholder-universite-publique',
  'Profil en cours d''analyse par l''agence',
  '—',
  '—',
  '—',
  65000,
  '[]',
  '[]',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;


-- ============================================================
-- Migration: 20260806160000_crous
-- ============================================================
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


-- ============================================================
-- Migration: 20260806170000_logement_reservation
-- ============================================================
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


-- ============================================================
-- Migration: 20260807120000_logement_correction
-- ============================================================
-- AlterEnum
ALTER TYPE "StatutLogementReservation" ADD VALUE 'correction_demandee';

-- AlterTable
ALTER TABLE "LogementReservation" ADD COLUMN "motifCorrection" TEXT;


-- ============================================================
-- Migration: 20260807130000_logement_remove_transmission
-- ============================================================
-- Move any existing rows away from the values being removed before recreating the enum
UPDATE "LogementReservation" SET "statut" = 'soumis' WHERE "statut" IN ('transmis', 'erreur');

-- AlterEnum: recreate StatutLogementReservation without 'transmis' / 'erreur'
ALTER TYPE "StatutLogementReservation" RENAME TO "StatutLogementReservation_old";
CREATE TYPE "StatutLogementReservation" AS ENUM ('soumis', 'correction_demandee');
ALTER TABLE "LogementReservation" ALTER COLUMN "statut" DROP DEFAULT;
ALTER TABLE "LogementReservation" ALTER COLUMN "statut" TYPE "StatutLogementReservation" USING ("statut"::text::"StatutLogementReservation");
ALTER TABLE "LogementReservation" ALTER COLUMN "statut" SET DEFAULT 'soumis';
DROP TYPE "StatutLogementReservation_old";

-- AlterTable: drop erreurTransmission (transmission concept removed — staff transmits outside the app)
ALTER TABLE "LogementReservation" DROP COLUMN "erreurTransmission";


-- ============================================================
-- Migration: 20260807140000_logement_en_cours_traitement
-- ============================================================
-- AlterEnum: ajoute un statut intermediaire "en_cours_traitement", pris automatiquement
-- quand un membre du staff ouvre la fiche detail d'une demande de logement encore "soumis".
ALTER TYPE "StatutLogementReservation" ADD VALUE 'en_cours_traitement' AFTER 'soumis';


-- ============================================================
-- Migration: 20260807150000_logement_crous_champs
-- ============================================================
-- Retire les champs hors-perimetre du formulaire CROUS candidat
ALTER TABLE "LogementReservation" DROP COLUMN "civilite";
ALTER TABLE "LogementReservation" DROP COLUMN "agenceAccompagnante";
ALTER TABLE "LogementReservation" DROP COLUMN "numeroPasseport";
ALTER TABLE "LogementReservation" DROP COLUMN "paysDemandeVisa";
ALTER TABLE "LogementReservation" DROP COLUMN "dateArriveePrevue";
DROP TYPE "CiviliteLogement";

-- Nouveau champ Sexe (remplace Civilite)
CREATE TYPE "SexeLogement" AS ENUM ('M', 'F');

-- Nouvelles colonnes, nullable le temps du backfill des lignes existantes
ALTER TABLE "LogementReservation" ADD COLUMN "nomUsage" TEXT;
ALTER TABLE "LogementReservation" ADD COLUMN "lieuNaissance" TEXT;
ALTER TABLE "LogementReservation" ADD COLUMN "paysNaissance" TEXT;
ALTER TABLE "LogementReservation" ADD COLUMN "sexe" "SexeLogement";

UPDATE "LogementReservation"
SET "lieuNaissance" = 'Non renseigné', "paysNaissance" = 'Non renseigné', "sexe" = 'M'
WHERE "lieuNaissance" IS NULL;

ALTER TABLE "LogementReservation" ALTER COLUMN "lieuNaissance" SET NOT NULL;
ALTER TABLE "LogementReservation" ALTER COLUMN "paysNaissance" SET NOT NULL;
ALTER TABLE "LogementReservation" ALTER COLUMN "sexe" SET NOT NULL;

-- Passeport recto/verso : renomme l'existant en recto, ajoute verso (backfill = recto)
ALTER TABLE "LogementReservation" RENAME COLUMN "fichierPasseportUrl" TO "fichierPasseportRectoUrl";
ALTER TABLE "LogementReservation" ADD COLUMN "fichierPasseportVersoUrl" TEXT;
UPDATE "LogementReservation" SET "fichierPasseportVersoUrl" = "fichierPasseportRectoUrl" WHERE "fichierPasseportVersoUrl" IS NULL;
ALTER TABLE "LogementReservation" ALTER COLUMN "fichierPasseportVersoUrl" SET NOT NULL;

-- Renomme l'attestation d'inscription en attestation d'accord prealable
ALTER TABLE "LogementReservation" RENAME COLUMN "fichierAttestationInscriptionUrl" TO "fichierAttestationAccordPrealableUrl";


-- ============================================================
-- Migration: 20260807160000_separer_logement_crous
-- ============================================================
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


-- ============================================================
-- Migration: 20260807170000_messages_pieces_jointes
-- ============================================================
-- Pièces jointes sur les messages (dossier candidat<->conseiller et messagerie interne)
ALTER TABLE "Message" ADD COLUMN "pieceJointeChemin" TEXT;

ALTER TABLE "MessageInterne" ADD COLUMN "pieceJointeNom" TEXT;
ALTER TABLE "MessageInterne" ADD COLUMN "pieceJointeTaille" TEXT;
ALTER TABLE "MessageInterne" ADD COLUMN "pieceJointeChemin" TEXT;

