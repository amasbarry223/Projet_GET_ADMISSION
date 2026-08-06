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
