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
