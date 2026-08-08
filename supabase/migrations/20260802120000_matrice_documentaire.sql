-- ⚠️ MIGRATION RECONSTITUÉE (n'existe pas dans prisma/migrations/).
-- Les tables "MatriceVersion" et "MatriceRegle" sont présentes dans prisma/schema.prisma et sur
-- la base réelle (introspectées via information_schema/pg_catalog le 2026-08-08 pour produire ce
-- fichier à l'identique : colonnes, types, défauts, contraintes, index et valeurs d'enum), mais
-- aucune migration Prisma existante ne les crée — elles ont manifestement été introduites via
-- `prisma db push` (script "db:push" du projet) sans jamais être capturées par
-- `prisma migrate dev`. Positionnée ici car "20260802130000_piece_unique_matrice_version"
-- (le lendemain) ajoute une clé étrangère Dossier → MatriceVersion, qui exige que cette table
-- existe déjà. Ce même écart existe dans prisma/migrations/ lui-même, pas seulement dans ce
-- dossier — à traiter séparément si vous voulez que `prisma migrate reset` reste rejouable
-- de bout en bout sur une base vierge.

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

-- TODO: define RLS policies for "MatriceVersion" and "MatriceRegle" (contenu métier interne, accès
-- normalement réservé au staff ADMIN/SUPER_ADMIN via l'application — aucune policy existante à
-- l'heure de cette migration ; n'en invente pas, valide-les avec l'équipe).
