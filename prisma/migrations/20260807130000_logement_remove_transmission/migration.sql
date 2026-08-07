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
